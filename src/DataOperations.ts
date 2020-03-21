import * as firebase from 'firebase/app';

import 'firebase/auth';
import 'firebase/functions';
import 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyAKlKilqli0ti_CVMe57bc_TIQ3Yw19xKQ",
    authDomain: "fides-652bb.firebaseapp.com",
    databaseURL: "https://fides-652bb.firebaseio.com",
    projectId: "fides-652bb",
    storageBucket: "fides-652bb.appspot.com",
    messagingSenderId: "241091693843",
    appId: "1:241091693843:web:de71ad8284a16f84bbdee6"
};

export const fireapp = firebase.initializeApp(firebaseConfig);

export enum Tags {
    Trustworthy = "Trustworthy",
    OnTime = "On Time, Observed Deadline",
    NoTime = "Not On Time",
    WrongOutcomeGood = "Misunderstood Me, Tried Their Best",
    WrongOutcomeBad = "Misunderstood Me, Didn't Even Try",
    NoLikeGood = "I Didn't Like The Results, Tried Their Best",
    NoLikeBad = "I Didn't Like The Results, Didn't Even Try",
}

export interface Rating {
    uid: string,
    rating: number,
    rawRating: number,
    tag?: Tags
}

type TagData = { [tag in Tags]: number };

export interface Person {
    uid: string,
    ratings: { [contractId: string]: Rating },
    score: number,
    metadata: { email: string, name: string, photo: string },
    tags?: TagData,
}

function adjustRatingWeight(rating: number, x: number): number {
    const d = 6.5;
    const u = 10;
    const adjustment = 60
        * (1 / (d * Math.sqrt(2 * Math.PI)))
        * Math.pow(Math.E, (-0.5) * Math.pow((x - u) / d, 2));
    return rating * Math.max(0.001, adjustment);
}

export function updateScore(ref: firebase.database.Reference) {
    ref.once('value', snapshot => {
        let person = snapshot.val() as Person;
        // Take only the entries that actually have a rating, i.e. from finished contracts
        let ratings = Object.values(person.ratings).filter((x: Rating) => !!x.rating);
        // Handle tags
        let tags = ratings.reduce(
            (acc: TagData, x: Rating) => x.tag ? Object.assign(acc, { [x.tag]: ((acc && acc[x.tag]) || 0) + 1 }) : acc,
            {} as TagData
        );
        console.log(tags);
        ref.child('tags').set(tags);
        if (Object.keys(ratings).length > 0) {
            // sum up all the ratings from each user, adjusted for the amount of
            // experience that user has with this one
            let total = ratings.reduce((acc, x) => acc + x.rating, 0);
            // Take the weighted average of the other users' ratings
            let newscore = Math.max(0.001, total / ratings.length);
            // make it not have ugly decimals
            let places = Math.trunc(Math.abs(Math.ceil(Math.log10(newscore)))) + 1;
            let adjusted = Math.round(newscore * Math.pow(10, places)) / Math.pow(10, places);
            ref.child('score').set(adjusted);
        }
    });
}

export function rejectContract(ref: firebase.database.Reference, uniqid: string) {
    ref.once('value', personSnap => {
        if (personSnap.val().pending) {
            Object.entries(personSnap.val().pending).forEach(([key, value]) => {
                if (value === uniqid) {
                    ref.child('pending/' + key).remove();
                    fireapp.database().ref('/contracts/' + value).remove();
                }
            });
        }
    });
}

export function acceptContract(ref: firebase.database.Reference, uniqid: string) {
    ref.once('value', personSnap => {
        if (personSnap.val().pending) {
            Object.entries(personSnap.val().pending).forEach(([key, value]) => {
                if (value === uniqid) {
                    ref.child('pending/' + key).remove();
                    ref.child('ratings/' + uniqid).set({ uid: "" });

                    let path1 = '/contracts/' + value + '/people/' + personSnap.val().uid;
                    fireapp.database().ref(path1 + '/accepted').set(true);

                    fireapp.database().ref(path1 + '/role').once('value', roleSnap => {
                        let path2 = '/contracts/' + value + '/roles/' + roleSnap.val() + '/accepted';
                        fireapp.database().ref(path2).set(true);
                    });
                }
            });
        }
    });
}

function regularizeDate(date: Date) {
    let n = new Date(date);
    n.setHours(0, 0, 0, 0);
    return n;
}

export enum Role { Initiator = "initiator", Other = "other", Arbitrator = "arbitrator" }

interface PersonRef {
    initialScore: number,
    uid: string,
    role: Role,
    accepted: boolean,
}

export interface Contract {
    uniqid: string,
    title: string,
    deadline: string,
    desc?: string,

    people: { [uid: string]: PersonRef },
    roles: { [role: string]: PersonRef },
}

export function associateContract(ref: firebase.database.Reference, uid: string) {
    ref.once('value', snapshot => {
        let contract = snapshot.val() as Contract;
        contract.roles = contract.roles || {};
        contract.people = contract.people || {};

        let role: Role | null = null;
        if (!contract.roles[Role.Initiator]) {
            role = Role.Initiator;
        } else if (!contract.roles[Role.Other]) {
            role = Role.Other;
        } else if (!contract.roles[Role.Arbitrator]) {
            role = Role.Arbitrator;
        }

        if (role) {
            let pref = fireapp.database().ref('/people/' + uid);
            pref.once('value', snapshot => {
                let pr = {
                    initialScore: snapshot.val().score,
                    uid: uid,
                    role: role,
                    accepted: role === Role.Initiator,
                };
                let updates: { [path: string]: any } = {};
                updates['roles/' + role] = pr;
                updates['people/' + uid] = pr;

                // @ts-ignore: Object is possibly 'null'.
                if (uid !== fireapp.auth().currentUser.uid) {
                    let key = pref.child('pending').push().key;
                    if (key) {
                        pref.child('pending/' + key).set(contract.uniqid);
                    }
                } else {
                    pref.child('ratings/' + contract.uniqid).set({ uid: "" });
                }
                ref.update(updates);
            });
        }
    });
}

export function review(contract: Contract, uid: string, target: string, rating: number, tag?: Tags) {
    if (!contract.roles[Role.Other]) {
        throw new Error("Not enough people to review.");
    }
    if (regularizeDate(new Date()) < new Date(contract.deadline)) {
        throw new Error("You cannot review before deadline!");
    }
    if (contract.roles[Role.Arbitrator] && contract.roles[Role.Arbitrator].uid !== uid) {
        throw new Error("Only the arbitrator can review in this contract.");
    }
    if (!Object.keys(contract.people).includes(uid)) {
        throw new Error("Your are not in this contract.");
    }
    if (!Object.keys(contract.people).includes(target)) {
        throw new Error("That's not a person in this contract!");
    }
    if (uid === target) {
        throw new Error("You cannot review yourself!")
    }
    if (rating > 10 || rating < -10) {
        throw new Error("Rating is out of acceptible range.");
    }
    if (!contract.people[target].accepted) {
        throw new Error("This person has not accepted the invitation yet!");
    }

    let tpRef = fireapp.database().ref('/people/' + target);
    //let alreadyExists = false;
    tpRef.once('value', tpSnap => {
        let targetPerson = tpSnap.val();
        let ratings = Object.values(targetPerson.ratings).filter((x: any) => !!x.rating);
        let experience = 1;
        if (Object.keys(ratings).length > 0) {
            // count the number of times each user has interacted with this one
            let raters: { [uid: string]: number } = {};
            ratings.forEach((rating: any) => {
                raters[rating.uid] = (raters[rating.uid] || 0) + 1;
            });
            experience = raters[uid];
        }
        //if (!tpSnap.hasChild('ratings/' + contract.uniqid)) {
        tpRef.child('ratings/' + contract.uniqid).set({
            uid: uid,
            rating: adjustRatingWeight(contract.people[uid].initialScore * rating, experience),
            rawRating: rating,
            tag: tag || null,
        });
        updateScore(tpRef);
        // } else {
        //     alreadyExists = true;
        // }
    });
    // if (alreadyExists) {
    //     throw new Error("You have already rated this person for this contract!");
    // }
}

export function newPerson(person: Person) {
    // @ts-ignore: Object is possibly 'null'.
    let id = fireapp.auth().currentUser.uid;
    person.uid = id;
    fireapp.database().ref('/people').child(id).set(person);
}

export function newContract(contract: Contract): firebase.database.Reference {
    let contractKey = fireapp.database().ref('/contracts').push().key;
    if (contractKey) {
        contract.uniqid = contractKey;
    }

    let ref = fireapp.database().ref('/contracts/' + contractKey);
    ref.set(contract);
    // @ts-ignore: Object is possibly 'null'.
    associateContract(ref, fireapp.auth().currentUser?.uid);
    return ref;
}
