import React from 'react';
import * as database from './DataOperations';
import CSS from 'csstype';
import {
    Link,
} from 'react-router-dom';
import { Contract } from './Contract';

interface RateState {
    contracts: { [uniqid: string]: database.Contract },
    currentUid: string
}

export class Rate extends React.Component<{}, RateState> {
    constructor(props: {}) {
        super(props);

        this.state = {
            contracts: {},
            currentUid: ""
        }
    }

    componentDidMount() {
        database.fireapp.auth().onAuthStateChanged(user => {
            if (user) {
                this.setState({ currentUid: user.uid });
                database.fireapp.database().ref('/people/' + user.uid + '/ratings').on('value', ratingsSnap => {
                    if (ratingsSnap.val() != null) {
                        Object.keys(ratingsSnap.val()).forEach(uniqid => {
                            database.fireapp.database().ref('/contracts/' + uniqid).on('value', contractSnap => {
                                console.log(uniqid, contractSnap.val());
                                this.setState(state => {
                                    return {
                                        contracts: Object.assign(state.contracts,
                                            { [uniqid]: contractSnap.val() })
                                    };
                                });
                            });
                        });
                    }
                });
            }
        });
    }

    callHandlerWrapped = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, contract: database.Contract, targetUid: string) => {
        e.preventDefault();
        const rating = window.prompt("What is your rating of this user?", "0");
        if (rating) {
            database.review(contract, this.state.currentUid, targetUid, +rating);
        }
    }

    render() {
        return (
            <div>
                <h2>Currently Active Contracts</h2>
                {Object.entries(this.state.contracts).map(([uniqid, c]) => (
                    <Contract key={uniqid} data={c} render={(users: database.Person[]) => {
                        return Object.values(users).map((u: database.Person) => {
                            if (u.uid != this.state.currentUid &&
                                c.people[u.uid].role != database.Role.Arbitrator) {
                                return (
                                    <button key={`rate-${u.uid}`}
                                        onClick={e => this.callHandlerWrapped(e, c, u.uid)}>
                                        Rate {u.metadata.name}
                                    </button>
                                );
                            }
                        });
                    }} />
                ))}
            </div>
        );
    }
}
