import React from 'react';
import './App.css';
import * as database from './DataOperations';
import CSS from 'csstype';
import { Link } from 'react-router-dom';

interface CCState {
    title: string,
    deadline: string,
    desc: string,
    userlist: [string | null, string | null],
    people: database.Person[],
    showBanner: boolean,
}

export class ContractCreator extends React.Component<{}, CCState> {
    constructor(props: {}) {
        super(props);

        this.state = {
            title: '',
            deadline: '',
            desc: '',
            userlist: [null, null],
            people: [],
            showBanner: false,
        };
    }

    componentDidMount() {
        database.fireapp.database().ref('/people').on('value', snapshot => {
            let people: database.Person[] = [];
            snapshot.forEach(item => {
                let v = item.val();
                let auth = database.fireapp;
                // @ts-ignore: Object is possibly 'null'.
                if (v.uid != auth.auth().currentUser.uid) {
                    people.push(v);
                }
            })
            this.setState({ people: people });
        });
    }

    handleChange(event: any, data: string) {
        let newState = Object.assign(this.state, { [data]: event.target.value });
        this.setState(newState);
    }

    handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (this.state.userlist[0]) {
            let c: database.Contract = {
                uniqid: "",
                title: this.state.title,
                deadline: this.state.deadline,
                desc: this.state.desc,
                people: {},
                roles: {}
            };
            let ref = database.newContract(c);
            database.associateContract(ref, this.state.userlist[0]);
            if (this.state.userlist[1]) {
                database.associateContract(ref, this.state.userlist[1]);
            }
            this.setState({
                title: '',
                deadline: '',
                desc: '',
                userlist: [null, null],
                showBanner: true,
            });
            setTimeout(_ => {
                this.setState({ showBanner: false });
            }, 3500);
        }
    }

    onPersonSelection = (ty: number, uid: string) => {
        let nl = this.state.userlist;
        const index = nl.indexOf(uid);
        if (index > -1) {
            nl.splice(index, 1);
        }
        if (ty != -1) {
            nl[ty] = uid;
        }
        this.setState({ userlist: nl });
        return false;
    }

    render() {
        const inputStyle: CSS.Properties = {
            float: 'right'
        };
        const groupStyle: CSS.Properties = {
            display: 'block',
            height: '50px'
        };

        function formatDate(d: Date) {
            let month = '' + (d.getMonth() + 1),
                day = '' + d.getDate(),
                year = d.getFullYear();

            if (month.length < 2)
                month = '0' + month;
            if (day.length < 2)
                day = '0' + day;
            return [year, month, day].join('-');
        }

        return (
            <div style={{ margin: '10px auto', width: '80%' }}>
                <h2 style={{ textAlign: 'center' }}>Create New Contract</h2>
                <form onSubmit={this.handleSubmit}>
                    <label style={groupStyle}>
                        Contract Title
                        <input type="text" placeholder="Buy me lunch"
                            style={inputStyle}
                            value={this.state.title} onChange={e => this.handleChange(e, 'title')} />
                    </label>
                    <br />
                    <label style={groupStyle}>
                        Contract Description of Requirements
                        <textarea placeholder="Please deilver 93lbs of Sushi to my location (999 Insane Square)."
                            style={inputStyle}
                            value={this.state.desc} onChange={e => this.handleChange(e, 'desc')} />
                    </label>
                    <br />
                    <label style={groupStyle}>
                        Contract Deadline
                        <input type="date" value={this.state.deadline}
                            style={inputStyle}
                            min={formatDate(new Date())}
                            onChange={e => this.handleChange(e, 'deadline')} />
                    </label>
                    <br />
                    <label>
                        <h3>Other Participant (Prospective) and Arbitrator (Optional)</h3>
                        {this.state.people.map((p: database.Person) =>
                            <Person key={p.uid} data={p}
                                selected={this.state.userlist.indexOf(p.uid)}
                                selection={this.onPersonSelection} />)}
                    </label>
                    <br />
                    <input style={{ margin: '0 auto', display: 'block' }}
                        type="submit" value="Submit" disabled={!(this.state.title != '' &&
                            this.state.userlist[0] != null &&
                            this.state.deadline != '')} />
                    {this.state.showBanner ?
                        <p style={{ backgroundColor: 'green', color: 'white' }}>Submitted!</p> : null}
                </form>
            </div>
        );
    }
}

function Person(props: {
    data: database.Person,
    selected: number,
    selection: (ty: number, uid: string) => boolean
}) {
    function callHandlerWrapped(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, ty: number) {
        e.preventDefault();
        props.selection(ty, props.data.uid)
        console.log(ty);
    }
    const style: CSS.Properties = {
        backgroundColor: props.selected == 0 ? 'green' : props.selected == 1 ? 'red' : 'blue',
        color: props.selected == 0 ? 'black' : props.selected == 1 ? 'white' : 'white',
        height: '32px',
        padding: '5px 5px 5px 5px'
    };
    return (
        <div style={style}>
            <span style={{ position: 'relative' }}>
                <img style={{ float: 'left', width: '32px', height: '32px', paddingRight: '10px', display: 'block' }}
                    src={props.data.metadata.photo} />
                <Link style={{ width: '300px', position: 'absolute', top: '21px', color: 'white' }}
                    to={`/dashboard/${props.data.uid}`}>{props.data.metadata.name}</Link>
            </span>
            <span style={{ float: 'right' }}>
                <button disabled={props.selected == 0}
                    key="other" onClick={e => callHandlerWrapped(e, 0)}>Other</button>
                <button disabled={props.selected == 1}
                    key="arbitrator" onClick={e => callHandlerWrapped(e, 1)}>Arbitrator</button>
                <button disabled={props.selected == -1}
                    key="deselect" onClick={e => callHandlerWrapped(e, -1)}>X</button>
            </span>
        </div>
    );
}
