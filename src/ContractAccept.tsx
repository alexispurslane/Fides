import React from 'react';
import * as database from './DataOperations';
import CSS from 'csstype';
import {
    Link,
} from 'react-router-dom';
import { Contract } from './Contract';

interface AcceptState {
    pendingContracts: database.Contract[],
    currentUid: string
}

export class ContractAccept extends React.Component<{}, AcceptState> {
    constructor(props: {}) {
        super(props);

        this.state = {
            pendingContracts: [],
            currentUid: ""
        }
    }

    componentDidMount() {
        database.fireapp.auth().onAuthStateChanged(user => {
            if (user) {
                this.setState({ currentUid: user.uid });
                database.fireapp.database().ref('/people/' + user.uid + '/pending').on('value', pendingSnap => {
                    this.setState({ pendingContracts: [] })
                    if (pendingSnap.val() != null) {
                        Object.values(pendingSnap.val()).forEach(uniqid => {
                            database.fireapp.database().ref('/contracts/' + uniqid).once('value', contractSnap => {
                                this.setState(state => {
                                    return {
                                        pendingContracts: state.pendingContracts.concat([contractSnap.val()])
                                    }
                                });
                            });
                        });
                    }
                });
            }
        });
    }

    handleSelection = (ty: number, uniqid: string) => {
        let uref = database.fireapp.database().ref('/people/' + this.state.currentUid);
        if (ty == 0) {
            database.acceptContract(uref, uniqid);
        } else {
            database.rejectContract(uref, uniqid);
        }
    }

    render() {
        return (
            <div>
                <h2>Accept Contracts and Arbitration Requests</h2>
                {this.state.pendingContracts.map(c => (
                    <Contract data={c}>
                        <button key="accept" onClick={e => this.handleSelection(0, c.uniqid)}>Accept</button>
                        <button key="reject" onClick={e => this.handleSelection(1, c.uniqid)}>Reject</button>
                    </Contract>
                ))}
            </div>
        );
    }
}
