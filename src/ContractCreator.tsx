import React from 'react';
import './App.css';
import * as database from './DataOperations';
import CSS from 'csstype';

interface CCState {
    title: string,
    deadline: string,
    desc: string,
    userlist: [string | null, string | null],
    people: database.Person[],
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
        };
    }


    componentDidMount() {
        database.fireapp.database().ref('/people').on('value', snapshot => {
            let people: database.Person[] = [];
            snapshot.forEach(item => {
                people.push(item.val());
            })
            this.setState({ people: people });
        });
    }

    handleChange(event: any, data: string) {
        if (data == 'desc') {
            this.setState({ desc: event.target.value });
        } else if (data == 'title') {
            this.setState({ title: event.target.value });
        } else if (data == 'userlist') {
            this.setState({ userlist: event.target.value });
        } else if (data == 'deadline') {
            this.setState({ deadline: event.target.value });
        }
    }

    handleSubmit(event: any) {
        let c: database.Contract = {
            uniqid: "",
            title: this.state.title,
            deadline: new Date(this.state.deadline),
            desc: this.state.desc,
            people: {},
            roles: {}
        };
        // TODO: Make UI for selecting people to get their UID to associate via.
        database.newContract(c);
        event.preventDefault();
    }

    onPersonSelection = (ty: number, uid: string) => {
            this.setState(state => {
                let nl = state.userlist;
                const index = nl.indexOf(uid);
                if (index > -1) {
                    nl.splice(index, 1);
                }
                if (ty != -1) {
                    nl[ty] = uid;
                }
                return {
                    userlist: nl
                };
            });
        return false;
    }

    render() {
        // TODO: Get list of users, convert to little HTML elements with name
        // and avatar. Each one has a closure that captures it's uID attached to
        // onClick and when it's clicked it sets the 'selected user' to that ID.
        // Then when a button is cilcked, it'll be addded.
        return (
            <div>
                <h2>Create New Contract</h2>
                <form onSubmit={this.handleSubmit}>
                    <label>
                        <h3>Contract Title</h3>
                        <input type="text" placeholder="Buy me lunch"
                               value={this.state.title} onChange={e => this.handleChange(e, 'title')}/>
                    </label>
                    <br/>
                    <label>
                        <h3>Contract Description of Requirements</h3>
                        <textarea placeholder="Please deilver 93lbs of Sushi to my location (999 Insane Square)."
                                  value={this.state.desc} onChange={e => this.handleChange(e, 'desc')}/>
                    </label>
                    <br/>
                    <label>
                        <h3>Contract Deadline</h3>
                        <input type="date" value={this.state.deadline}
                               onChange={e => this.handleChange(e, 'deadline')}/>
                    </label>
                    <br/>
                    <label>
                        <h3>Other Participant (Prospective) and Arbitrator (Optional)</h3>
                        {this.state.people.map((p: database.Person) =>
                            <Person key={p.uid} data={p}
                                    selected={this.state.userlist.indexOf(p.uid)}
                                    selection={this.onPersonSelection} /> )}
                    </label>
                    <br/>
                    <input type="submit" value="Submit" />
                </form>
            </div>
        );
    }
}

function Person(props: { data: database.Person,
                         selected: number,
                         selection: (ty: number, uid: string) => boolean }) {
    function doTheThing(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, ty: number) {
        e.preventDefault();
        props.selection(ty, props.data.uid)
        console.log(ty);
    }
    const style: CSS.Properties = {
        backgroundColor: props.selected == 0 ? 'green' : props.selected == 1 ? 'red' : 'blue',
        color: props.selected == 0 ? 'black' : props.selected == 1 ? 'white' : 'white'
    };
    console.log("Selected: " + props.selected);
    return (
        <div style={style}>
            <label>
                <img width="30" src={props.data.metadata.photo} />
                {props.data.metadata.name}
            </label>
            <button key="other" onClick={e => doTheThing(e, 0)}>Other</button>
            <button key="arbitrator" onClick={e => doTheThing(e, 1)}>Arbitrator</button>
            <button key="deselect" onClick={e => doTheThing(e, -1)}>X</button>
        </div>
    );
}
