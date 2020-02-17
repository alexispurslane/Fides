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
import { UserInformation } from './UserInformation';

interface MatchParams {
    uid: string;
}

interface DashProps extends RouteComponentProps<MatchParams> { }

interface DashState {
    info?: { name: string, email: string, photo: string },
    uid?: string,
    error?: Error
}

class Dashboard extends React.Component<DashProps, DashState> {
    constructor(props: DashProps) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        database.fireapp.database()
            .ref('/people/' + this.props.match.params.uid + '/metadata')
            .on('value', snapshot => {
                this.setState({ info: snapshot.val(), uid: this.props.match.params.uid });
            }, (e: Error) => {
                this.setState({ error: e });
            });
    }

    componentDidUpdate() {
        // Update caused by change to UID in URL, which means we need to update the info we're showing.
        if (this.state.uid != this.props.match.params.uid) {
            database.fireapp.database()
                .ref('/people/' + this.props.match.params.uid + '/metadata')
                .on('value', snapshot => {
                    this.setState({ info: snapshot.val(), uid: this.props.match.params.uid });
                }, (e: Error) => {
                    this.setState({ error: e });
                });
        }
    }

    render() {
        const photoStyle: CSS.Properties = {
            'width': '32px',
            'float': 'left',
            'paddingRight': '10px'
        };
        // @ts-ignore: Object is possibly 'null'.
        const cuser = database.fireapp.auth().currentUser;
        if (cuser && cuser.uid == this.props.match.params.uid) {
            let match = this.props.match;
            if (!this.state.error) {
                return (
                    <div>
                        <div id="header">
                            <img src={this.state.info?.photo} style={photoStyle} />
                            <h1>Welcome to your dashboard, {this.state.info?.name || "unknown"}</h1>
                        </div>

                        <ul>
                            <li>
                                <Link to={`/dashboard/${match.params.uid}`}>Profile</Link>
                            </li>
                            <li>
                                <Link to={`${match.url}/accept`}>Accept Contracts</Link>
                            </li>
                            <li>
                                <Link to={`${match.url}/create`}>Create Contracts</Link>
                            </li>
                            <li>
                                <Link to={`${match.url}/review`}>Active Contracts</Link>
                            </li>
                        </ul>

                        <Switch>
                            <Route path={`${match.path}/accept`}>
                                <ContractAccept />
                            </Route>
                            <Route path={`${match.path}/review`}>
                                <Rate />
                            </Route>
                            <Route path={`${match.path}/create`}>
                                <ContractCreator />
                            </Route>
                            <Route path={`/dashboard/${match.params.uid}`}>
                                <UserInformation user={match.params.uid} editible={true} />
                            </Route>
                        </Switch>
                    </div>
                )
            } else {
                return (<h2>Oops! Doesn't look like we can't get ahold of your info!</h2>);
            }
        } else {
            return (
                <div>
                    <div id="header">
                        <img src={this.state.info?.photo} style={photoStyle} />
                        <h1>User Profile: {this.state.info?.name || "unknown"}</h1>
                        <div>
                            <UserInformation user={this.props.match.params.uid} editible={false} />
                        </div>
                    </div>
                </div>
            );
        }
    }
}

export { Dashboard };
