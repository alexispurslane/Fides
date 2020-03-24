import React from 'react';
import {
    RouteComponentProps,
    Link,
} from 'react-router-dom';
import { Contract } from './Contract';
import * as database from './DataOperations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import CSS from 'csstype';
import { UserAvatar } from './UserInformation';

interface MatchParams {
    uniqid: string,
}

interface ViewProps extends RouteComponentProps<MatchParams> { }

interface ContractsState {
    contract?: database.Contract,
    contracts: database.Contract[],
    search: string,
}

const fuzzyMatch = (search: string) => (contract: database.Contract) => {
    return contract.deadline.includes(search) ||
        contract.desc?.toLowerCase().includes(search.toLowerCase()) ||
        contract.title.toLowerCase().includes(search.toLowerCase()) ||
        Object.values(contract.people).some(x => (x.name || "")
            .toLowerCase()
            .includes(search.toLowerCase()));
};

export class ViewContracts extends React.Component<ViewProps, ContractsState> {
    constructor(props: ViewProps) {
        super(props);
        this.state = {
            contract: undefined,
            contracts: [],
            search: ""
        }
    }

    componentDidMount() {
        database.fireapp.database().ref("/contracts").on('value', snapshot => {
            let contracts: database.Contract[] = Object.values(snapshot.val());
            let contract = snapshot.val()[this.props.match.params.uniqid];
            this.setState({
                contracts: contracts.filter((c: database.Contract) => !c.hidden),
                contract: contract?.hidden || contract
            });
        });
    }

    render() {
        const findContracts = this.state.contracts.length > 0 ? (
            <div>
                <h2>Find Contracts</h2>
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
                {this.state.contracts.filter(fuzzyMatch(this.state.search)).map(contract => {
                    return (<Contract key={contract.uniqid} data={contract} render={() => undefined} />)
                })}
            </div>
        ) : null;
        const singleContract = this.state.contract ? (<div>
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><a href="/contracts">Contracts</a></li>
                    <li className="breadcrumb-item active" aria-current="page">Contract {this.props.match.params.uniqid}</li>
                </ol>
            </nav>
            <Contract
                data={this.state.contract}
                render={() => undefined} />
        </div>) : null;
        const loading = (<div className="d-flex align-items-center">
            <strong>Loading...</strong>
            <div className="spinner-border ml-auto text-warning" role="status" aria-hidden="true"></div>
        </div>);
        return (
            <div>
                {singleContract || findContracts || loading}
            </div>
        );
    }
}

interface MatchParams2 {
    uid: string,
}

interface ViewProps2 extends RouteComponentProps<MatchParams2> { }

interface UsersState {
    users: database.Person[],
    search: string,
}

const fuzzyMatchUser = (search: string) => (user: database.Person) => {
    return user.metadata.name.toLowerCase().includes(search.toLowerCase()) ||
        user.metadata.email.toLowerCase().includes(search.toLowerCase()) ||
        (user.metadata.bio || "").toLowerCase().includes(search.toLowerCase());
};

export class ViewDashboards extends React.Component<ViewProps2, UsersState> {
    constructor(props: ViewProps2) {
        super(props);
        this.state = {
            users: [],
            search: ""
        }
    }

    componentDidMount() {
        database.fireapp.database().ref("/people").on('value', snapshot => {
            this.setState({
                users: Object.values(snapshot.val()),
            });
        });
    }

    render() {
        const findUsers = this.state.users.length > 0 ? (
            <div>
                <h2>Find Users</h2>
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
                <table className="table table-striped">
                    <thead className="thead-dark">
                        <tr>
                            <th scope="col"> User </th>
                            <th scope="col"> Bio </th>
                            <th scope="col"> Score </th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.users.filter(fuzzyMatchUser(this.state.search)).map(user => {
                            return (<Person key={user.uid} data={user} />);
                        })}
                    </tbody>
                </table>
            </div>
        ) : null;
        const loading = (<div className="d-flex align-items-center">
            <strong>Loading...</strong>
            <div className="spinner-border ml-auto text-warning" role="status" aria-hidden="true"></div>
        </div>);
        return (
            <div>
                {findUsers || loading}
            </div>
        );
    }
}

export function Person(props: {
    data: database.Person,
}) {
    const imageStyle: CSS.Properties = {
        float: 'left',
        width: '32px',
        borderRadius: '50%',
        height: '32px',
        marginRight: '10px',
        display: 'block'
    };
    const score = props.data.score;
    const scoreColor = score > 2 ? 'success' : score < 0.5 ? 'danger' : 'warning';
    return (
        <tr className="table">
            <td>
                <UserAvatar style={imageStyle} avatar={props.data.metadata.photo} />
                <Link to={`/dashboard/${props.data.uid}`}>{props.data.metadata.name}</Link>
            </td>
            <td>
                <p className="text-muted"><small>{props.data.metadata.bio}</small></p>
            </td>
            <td>
                <span className={`badge badge-${scoreColor}`}>{score}</span>
            </td>
        </tr>
    );
}
