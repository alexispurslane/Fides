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
        if (Object.keys(person.ratings).length > 0) {
            let total = Object.values(person.ratings).map(x => x.rating).reduce((acc, x) => acc + x, 0);
            let unique_people = Object.values(person.ratings).map(x => x.uid).length;
            let newscore = total / (unique_people + Math.floor(Object.keys(person.ratings).length / 2));
            let places = Math.trunc(Math.abs(Math.ceil(Math.log10(newscore)))) + 1;
            ref.set({
                'score':Math.round(newscore * places) / places
            });
        }
    });
}

function regularizeDate(date: Date) {
    let n = Object.create(date);
    n.setHours(0, 0, 0, 0);
    return n;
}

enum Role { Initiator = "initiator", Other = "other", Arbitrator = "arbitrator" }
interface PersonRef { initialScore: number, uid: string, role: Role, person: firebase.database.Reference }

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

        console.log(uid);

        let role: Role | null = null;
        if (!contract.roles[Role.Initiator]) {
            role = Role.Initiator;
        } else if (!contract.roles[Role.Other]) {
            role = Role.Other;
        } else if (!contract.roles[Role.Arbitrator]) {
            role = Role.Arbitrator;
        }

        if (role) {
            fireapp.database().ref('/people/' + uid).once('value', snapshot => {
                let pr = {
                    initialScore: snapshot.val().score,
                    uid: uid,
                    role: role
                };
                let updates: { [path: string]: any } = {};
                updates['roles/' + role] = pr;
                updates['people/' + uid] = pr;
                ref.update(updates);
            });
        }
    });
}

export function canBeginReviewing(contract: Contract, uid: string, time: Date): boolean {
    return contract.roles[Role.Other] && regularizeDate(time) >= new Date(contract.deadline) &&
        ((contract.roles[Role.Arbitrator] && contract.roles[Role.Arbitrator].uid === uid) ||
         uid in contract.people);
}

export function review(contract: Contract, uid: string, target: string, rating: number) {
    if (contract.people.other === undefined) {
        throw new Error("No other users to review!");
    }
    if (!(uid in Object.keys(contract.people))) {
        throw new Error("That's not a person in this contract!");
    }
    if (!canBeginReviewing(contract, uid, new Date())) {
        throw new Error("You can't review at this time.");
    }
    if (uid === target) {
        throw new Error("You cannot review yourself!")
    }
    if (rating > 10 || rating < -10) {
        throw new Error("Rating is out of acceptible range.");
    }

    let targetPerson = fireapp.database().ref('/people/' + contract.people[target].uid);
    rating = rating < 0 ? 1.0 / 10^(Math.abs(rating) / 2) : rating;
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
