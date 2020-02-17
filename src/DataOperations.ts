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

export interface Rating {
    uid: string,
    rating: number
}

export interface Person {
    uid: string,
    ratings: { [contractId: string]: Rating },
    score: number,
    metadata: { email: string, name: string, photo: string },
}

export function updateScore(ref: firebase.database.Reference) {
    ref.once('value', snapshot => {
        let person = snapshot.val() as Person;
        let ratings = Object.values(person.ratings).filter((x: Rating) => !!x.rating);
        if (Object.keys(ratings).length > 0) {
            let total = ratings.reduce((acc, x) => acc + x.rating, 0);
            let unique_people = ratings.map(x => x.uid).length;
            let newscore = total / (unique_people + Math.floor(ratings.length / 2));
            let places = Math.trunc(Math.abs(Math.ceil(Math.log10(newscore)))) + 1;
            ref.set({
                score: Math.round(newscore * places) / places
            });
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
                    accepted: role == Role.Initiator,
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
                }
                ref.update(updates);
            });
        }
    });
}

export function review(contract: Contract, uid: string, target: string, rating: number) {
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
        console.log(uid, Object.keys(contract.people))
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

    let targetPerson = fireapp.database().ref('/people/' + contract.people[target].uid);
    rating = rating < 0 ? 1.0 / 10 ^ (Math.abs(rating) / 2) : rating;
    targetPerson.child('ratings/' + contract.uniqid).set({
        uid: uid,
        rating: contract.people[uid].initialScore * rating
    })
    updateScore(targetPerson);
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
    console.log(contract);
    // @ts-ignore: Object is possibly 'null'.
    associateContract(ref, fireapp.auth().currentUser?.uid);
    return ref;
}
