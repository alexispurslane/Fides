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

interface ContractProps {
    data: database.Contract,
    selection: (ty: number, uniqid: string) => void
}

class Contract extends React.Component<ContractProps, { userName: string }> {
    constructor(props: ContractProps) {
        super(props);
        this.state = {
            userName: "Unknown"
        }
    }

    callHandlerWrapped = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, ty: number) => {
        e.preventDefault();
        this.props.selection(ty, this.props.data.uniqid)
    }

    componentDidMount() {
        database.fireapp.database().ref('/people/' + this.props.data.roles.initiator.uid + '/metadata/name')
            .once('value', snapshot => {
                this.setState({ userName: snapshot.val() });
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
                <span>
                    <h3>{this.props.data.title}</h3>
                    <p><b>Requested Role:</b> {this.props.data.people[cuid].role}</p>
                    <p>
                        <b>Initiator:</b>
                        <Link to={`/dashboard/${this.props.data.roles.initiator.uid}`}>{this.state.userName}</Link>
                    </p>
                </span>
                <span>
                    <button key="accept" onClick={e => this.callHandlerWrapped(e, 0)}>Accept</button>
                    <button key="reject" onClick={e => this.callHandlerWrapped(e, 1)}>Reject</button>
                </span>
            </div>
        );
    }
}
