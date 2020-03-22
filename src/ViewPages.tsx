import React from 'react';
import {
    RouteComponentProps,
} from 'react-router-dom';
import { Contract } from './Contract';
import * as database from './DataOperations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'

interface MatchParams {
    uniq_or_u_id: string;
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
            this.setState({
                contracts: Object.values(snapshot.val()),
                contract: snapshot.val()[this.props.match.params.uniq_or_u_id]
            });
        });
    }

    render() {
        return (
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
        );
    }
}

export class ViewDashboards extends React.Component<ViewProps, {}> {
    render() {
        return (
            <div>
                <h2>Find Users</h2>
            </div>
        );
    }
}
