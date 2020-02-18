import React from 'react';
import './App.css';
import * as database from './DataOperations';
import CSS from 'csstype';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBan } from '@fortawesome/free-solid-svg-icons'

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
            <div>
                <h2>Create New Contract</h2>
                <form onSubmit={this.handleSubmit}>
                    <div className="form-group row">
                        <label htmlFor="title" className="col-sm-2 col-form-label">Contract title</label>
                        <div className="col-sm-10">
                            <input className="form-control form-control-lg" type="text" placeholder="Contract title" id="title"
                                aria-describedby="titleHelp"
                                value={this.state.title}
                                onChange={e => this.handleChange(e, 'title')} />
                            <small id="titleHelp" className="form-text text-muted">
                                This is a short few-word description of what the contract is about. Be descriptive!
                </small>
                        </div>
                    </div>
                    <div className="form-group row">
                        <label htmlFor="desc" className="col-sm-2 col-form-label">Contract description</label>
                        <div className="col-sm-10">
                            <textarea className="form-control form-control-sm" placeholder="Please deilver 93lbs of Sushi to my location (999 Insane Square)."
                                style={{ height: '100px' }} id="desc"
                                aria-describedby="descHelp"
                                value={this.state.desc} onChange={e => this.handleChange(e, 'desc')} />
                            <small id="descHelp" className="form-text text-muted">
                                This can be as long as you need it to be, and try to be specific about what you want to prevent miscommunication.
            </small>
                        </div>
                    </div>
                    <div className="form-group row">
                        <label htmlFor="deadline" className="col-sm-2 col-form-label">Contract deadline</label>
                        <div className="col-sm-10">
                            <input type="date" value={this.state.deadline} id="deadline"
                                className="form-control"
                                aria-describedby="deadlineHelp"
                                min={formatDate(new Date())}
                                onChange={e => this.handleChange(e, 'deadline')} />
                            <small id="deadlineHelp" className="form-text text-muted">
                                This is when the contract should be fullfilled. You cannot review others in the contract before this date.
            </small>
                        </div>
                    </div>
                    <input className="btn btn-success"
                        type="submit" value="Submit" disabled={!(this.state.title != '' &&
                            this.state.userlist[0] != null &&
                            this.state.deadline != '')} />
                    {this.state.showBanner ?
                        <div className="alert alert-primary" role="alert">
                            <b>Success</b> Contract successfully created and sent!
                     </div> : null}
                    <br />
                    <br />
                    <table className="table table-striped">
                        <thead className="thead-dark">
                            <tr>
                                <th scope="col"> User </th>
                                <th scope="col"> Role </th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.state.people.map((p: database.Person) =>
                                <Person key={p.uid} data={p}
                                    selected={this.state.userlist.indexOf(p.uid)}
                                    selection={this.onPersonSelection} />)}
                        </tbody>
                    </table>
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
    const colorCode = props.selected == 0 ? 'primary' : props.selected == 1 ? 'secondary' : 'default';
    const imageStyle: CSS.Properties = {
        float: 'left',
        width: '32px',
        borderRadius: '50%',
        height: '32px',
        marginRight: '10px',
        display: 'block'
    };
    return (
        <tr className={`table-${colorCode}`}>
            <td>
                <img style={imageStyle} src={props.data.metadata.photo} />
                <Link to={`/dashboard/${props.data.uid}`}>{props.data.metadata.name}</Link>
            </td>
            <td>
                <div className="btn-group">
                    <button className="btn btn-sm btn-primary" disabled={props.selected == 0}
                        key="other" onClick={e => callHandlerWrapped(e, 0)}>Other</button>
                    <button className="btn btn-sm btn-secondary" disabled={props.selected == 1}
                        key="arbitrator" onClick={e => callHandlerWrapped(e, 1)}>Arbitrator</button>
                    <button className="btn btn-sm btn-danger" disabled={props.selected == -1}
                        key="deselect" onClick={e => callHandlerWrapped(e, -1)}>
                        <FontAwesomeIcon icon={faBan} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
