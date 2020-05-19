import React from 'react';
import * as database from './DataOperations';
import $ from 'jquery';
import { Contract } from './Contract';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faSearch } from '@fortawesome/free-solid-svg-icons'

const fuzzyMatch = (search: string) => (contract: database.Contract) => {
    return contract.deadline.includes(search) ||
        contract.desc?.toLowerCase().includes(search.toLowerCase()) ||
        contract.title.toLowerCase().includes(search.toLowerCase()) ||
        Object.values(contract.people).some(x => (x.name || "")
            .toLowerCase()
            .includes(search.toLowerCase()));
};

interface RateState {
    contracts: { [uniqid: string]: database.Contract },
    currentUid: string,
    callback: () => void,
    rating: string,
    hasContracts: boolean,
    banner: JSX.Element | null,
    search: string,
    tag?: string
}

export class Rate extends React.Component<{}, RateState> {
    constructor(props: {}) {
        super(props);

        this.state = {
            search: "",
            tag: undefined,
            contracts: {},
            callback: () => { },
            rating: "",
            currentUid: "",
            hasContracts: false,
            banner: null
        }
    }

    componentDidMount() {
        database.fireapp.auth().onAuthStateChanged(user => {
            if (user) {
                this.setState({ currentUid: user.uid });
                database.fireapp.database().ref('/people/' + user.uid + '/ratings').on('value', ratingsSnap => {
                    if (ratingsSnap.val() !== null) {
                        const ratings = Object.keys(ratingsSnap.val());
                        if (ratings.length > 0) {
                            this.setState({ hasContracts: true });
                        }
                        ratings.forEach(uniqid => {
                            database.fireapp.database().ref('/contracts/' + uniqid).on('value', contractSnap => {
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
        database.fireapp.database().ref('/people/' + targetUid + '/ratings/' + contract.uniqid + '/rawRating').once('value', snap => {
            console.log(snap.val());
            this.setState({ rating: "" + snap.val() });
            $('#rateModal').modal('show');
            this.setState({
                callback: () => {
                    const rating = this.state.rating;
                    if (rating && rating !== "") {
                        try {
                            database.review(contract, this.state.currentUid, targetUid, +rating, this.state.tag as (database.Tags | undefined));
                            this.setState({
                                banner: <div className="alert alert-success"><b>Success</b> Rating posted</div>
                            })
                        } catch (e) {
                            this.setState({
                                banner: <div className="alert alert-danger"><b>{e.name}</b> {e.message}</div>
                            });
                        } finally {
                            setTimeout(_ => this.setState({ banner: null }), 3500);
                        }
                    }
                }
            });
        });
    }

    render() {
        const contracts = Object.entries(this.state.contracts);
        if (contracts.length === 0 && this.state.hasContracts) {
            return (<div className="d-flex align-items-center">
                <strong>Loading...</strong>
                <div className="spinner-border ml-auto text-success" role="status" aria-hidden="true"></div>
            </div>);
        } else {
            return (
                <div>
                    <div className="input-group mb-3">
                        <div className="input-group-prepend">
                            <span className="input-group-text" id="basic-addon1">
                                <FontAwesomeIcon icon={faSearch} />
                            </span>
                        </div>
                        <input type="search"
                            className="form-control"
                            placeholder="Search..."
                            aria-label="Search"
                            aria-describedby="basic-addon1"
                            value={this.state.search}
                            onChange={e => this.setState({ search: e.target.value })} />
                    </div>
                    {this.state.banner}
                    <div className="modal" role="dialog" id="rateModal">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">How would you like to rate this person?</h5>
                                </div>
                                <div className="modal-body">
                                    <p>Please be careful and
                                    thoughtful&mdash;this does effect how they
                                    look to other people! Also, please choose a
                                    number between ten and negative ten.</p>
                                </div>
                                <div className="modal-footer">
                                    {Object.values(database.Tags).filter(k => typeof k === "string").map(option => {
                                        return (
                                            <h6 style={{ display: 'inline' }} key={option}><button onClick={e => this.setState({ tag: option })}
                                                className={"badge badge-" + (option === this.state.tag ? "primary" : "secondary")}>{option}</button></h6>
                                        );
                                    })}
                                    <div>
                                        <h6 style={{ display: 'inline' }}>{this.state.rating}</h6>
                                        {[...Array(21).keys()].map((_, i) => {
                                            return (
                                                <button id={i.toString()} key={i}
                                                    onClick={_ => this.setState({ rating: (i - 10).toString() })}
                                                    style={{ border: 'none', background: 'none' }}>
                                                    <FontAwesomeIcon
                                                        icon={faStar}
                                                        color={+this.state.rating >= i - 10 ?
                                                            '#007bff' : 'gray'} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <hr />
                                    <input type="submit" className="btn btn-success" data-dismiss="modal"
                                        onClick={this.state.callback.bind(this)} value="Rate" />
                                    <button className="btn btn-danger" data-dismiss="modal">Nevermind</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h2>Currently Active Contracts</h2>
                    <div className="card-columns">
                        {contracts.filter(([_, c]) => new Date() <= new Date(c.deadline) && fuzzyMatch(this.state.search)(c))
                            .map(([uniqid, c]) => (
                                <Contract key={uniqid} data={c} render={(users: database.Person[]) => {
                                    let roles = Object.values(users).map((u: database.Person) => {
                                        if (u.uid !== this.state.currentUid &&
                                            c.people[u.uid].role !== database.Role.Arbitrator) {
                                            return (
                                                <button key={`rate-${u.uid}`}
                                                    className="btn btn-info btn-sm"
                                                    onClick={e => this.callHandlerWrapped(e, c, u.uid)}>
                                                    Rate {u.metadata.name}
                                                </button>
                                            );
                                        }
                                    });
                                    return (
                                        <div className="btn-group" role="role-group" aria-label="Users involved">
                                            {roles}
                                        </div>
                                    );
                                }} />
                            ))}
                    </div>
                    <br />
                    <h2>Completed/Past Due Contracts</h2>
                    <div className="card-columns">
                        {contracts.filter(([_, c]) => new Date() > new Date(c.deadline) && fuzzyMatch(this.state.search)(c))
                            .map(([uniqid, c]) => (
                                <Contract key={uniqid} data={c} render={(users: database.Person[]) => {
                                    let roles = Object.values(users).map((u: database.Person) => {
                                        if (u.uid !== this.state.currentUid &&
                                            c.people[u.uid].role !== database.Role.Arbitrator) {
                                            return (
                                                <button key={`rate-${u.uid}`}
                                                    className="btn btn-info btn-sm"
                                                    onClick={e => this.callHandlerWrapped(e, c, u.uid)}>
                                                    Rate {u.metadata.name}
                                                </button>
                                            );
                                        }
                                    });
                                    return (
                                        <div className="btn-group" role="role-group" aria-label="Users involved">
                                            {roles}
                                        </div>
                                    );
                                }} />
                            ))}
                    </div>
                </div>
            );
        }
    }
}
