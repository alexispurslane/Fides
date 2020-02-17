import React from 'react';
import * as database from './DataOperations';
import CSS from 'csstype';
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
                    {!!this.props.render ? this.props.render(this.state.users) : this.props.children}
                </div>
            </div>
        );
    }
}

