import React from 'react';
import * as database from './DataOperations';
import CSS from 'csstype';
import {
    Link,
} from 'react-router-dom';

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
                {this.state.pendingContracts.map(c => <Contract data={c}
                    selection={(ty, uniqid) => this.handleSelection(ty, uniqid)} />)}
            </div>
        );
    }
}

// TODO: Unify these two contract views (this one and the one in ./Rate.tsx) somehow.
interface ContractProps {
    data: database.Contract,
    selection: (ty: number, uniqid: string) => void
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

class Contract extends React.Component<ContractProps, { users: database.Person[] }> {
    constructor(props: ContractProps) {
        super(props);
        this.state = {
            users: []
        }
    }

    callHandlerWrapped = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, ty: number) => {
        e.preventDefault();
        this.props.selection(ty, this.props.data.uniqid)
    }

    componentDidMount() {
        Object.values(this.props.data.people).forEach(contractEntry => {
            database.fireapp.database().ref('/people/' + contractEntry.uid)
                .orderByChild("metadata/name")
                .on('value', snapshot => {
                    this.setState(state => {
                        return {
                            users: Object.assign(state.users, { [contractEntry.uid]: snapshot.val() })
                        };
                    });
                });
        });
    }

    render() {
        const style: CSS.Properties = {
            border: '1px solid black',
            margin: '10px auto',
            width: '80%'
        };
        // @ts-ignore: Object is possibly 'null'.
        const cuid = database.fireapp.auth().currentUser.uid;
        return (
            <div style={style}>
                <div>
                    <h2>{this.props.data.title}</h2>
                    <h3>Details</h3>
                    <p><b>Deadline:</b> {this.props.data.deadline}</p>
                    <p><b>Instructions:</b><br />{this.props.data.desc}</p>
                    <h3>People</h3>
                    {Object.values(this.state.users).map(u => <div>
                        <p>
                            <b>{capitalize(this.props.data.people[u.uid].role)}:&nbsp;</b>
                            <Link to={`/dashboard/${u.uid}`}>{u.metadata.name}</Link>
                        </p>
                    </div>
                    )}
                </div>
                <div>
                    <button key="accept" onClick={e => this.callHandlerWrapped(e, 0)}>Accept</button>
                    <button key="reject" onClick={e => this.callHandlerWrapped(e, 1)}>Reject</button>
                </div>
            </div>
        );
    }
}
