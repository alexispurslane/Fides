import React from 'react';
import * as database from './DataOperations';
import { Link } from 'react-router-dom';

interface ContractProps {
    data: database.Contract,
    currentUid?: string,
    render?: (users: database.Person[]) => React.ReactNode
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export class Contract extends React.Component<ContractProps, { users: database.Person[] }> {
    constructor(props: ContractProps) {
        super(props);
        this.state = {
            users: []
        }
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
        // @ts-ignore: Object is possibly 'null'.
        return (
            <div className="card m-1">
                <div className="card-body">
                    <h5 className="card-title"><a href={"/contract/" + this.props.data.uniqid}>{this.props.data.title}</a></h5>
                    <h6 className="card-subtitle mb-2 text-muted">{this.props.data.deadline}</h6>
                    <p className="card-text">{this.props.data.desc}</p>
                    {!!this.props.render ? this.props.render(this.state.users) : this.props.children}
                </div>
                <ul className="list-group list-group-flush">
                    {Object.values(this.state.users).map(u => {
                        let udata = this.props.data.people[u.uid];
                        return <li key={u.uid} className="list-group-item">
                            <b>{capitalize(this.props.data.people[u.uid].role)}:&nbsp;</b>
                            <Link style={{ color: udata.accepted ? 'green' : 'red' }} to={`/dashboard/${u.uid}`}>{u.metadata.name}</Link>
                        </li>;
                    }
                    )}
                </ul>
            </div>
        );
    }
}

