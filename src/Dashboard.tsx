import React from 'react';
import './App.css';
import * as database from './DataOperations';
import CSS from 'csstype';
import {
    Switch,
    Route,
    Link,
    RouteComponentProps
} from 'react-router-dom';
import { Contract } from './Contract';
import { ContractCreator } from './ContractCreator';
import { ContractAccept } from './ContractAccept';
import { Rate } from './Rate';

interface MatchParams {
    uid: string;
}

interface DashProps extends RouteComponentProps<MatchParams> {}

interface DashState {
    info?: { name: string, email: string, photo: string },
    error?: Error
}

class Dashboard extends React.Component<DashProps, DashState> {
    constructor(props: DashProps) {
        super(props);
        this.state = {};
    }
    componentDidMount = () => {
        database.fireapp.database()
                .ref('/people/' + this.props.match.params.uid + '/metadata')
                .on('value', snapshot => {
            this.setState({ info: snapshot.val() });
        }, (e: Error) => {
            this.setState({ error: e });
        });
    }
    render() {
        let match = this.props.match;
        if (!this.state.error) {
            const photoStyle: CSS.Properties = {
                'width': '32px',
                'float': 'left',
                'paddingRight': '10px'
            };
            return (
                <div>
                    <div id="header">
                        <img alt="avatar" src={this.state.info?.photo} style={photoStyle} />
                        <h1>Welcome to your dashboard, {this.state.info?.name || "unknown"}</h1>
                    </div>

                    <ul>
                        <li>
                            <Link to={`${match.url}/accept`}>Accept Contracts</Link>
                        </li>
                        <li>
                            <Link to={`${match.url}/create`}>Create Contracts</Link>
                        </li>
                        <li>
                            <Link to={`${match.url}/review`}>Review Users</Link>
                        </li>
                    </ul>

                    {/* The Topics page has its own <Switch> with more routes
                        that build on the /topics URL path. You can think of the
                        2nd <Route> here as an "index" page for all topics, or
                        the page that is shown when no topic is selected */}
                        <Switch>
                            <Route path={`${match.path}/contract/:contractId`}>
                                <Contract />
                            </Route>
                            <Route path={`${match.path}/accept`}>
                                <ContractAccept />
                            </Route>
                            <Route path={`${match.path}/review`}>
                                <Rate />
                            </Route>
                            <Route path={`${match.path}/create`}>
                                <ContractCreator />
                            </Route>
                        </Switch>
                </div>
            )
        } else {
            return (<h2>Oops! Doesn't look like we can't get ahold of your info!</h2>);
        }
    }
}

export { Dashboard };
