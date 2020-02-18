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
    info?: { name: string, email: string, photo: string, bio?: string },
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
            width: '50px',
            display: 'block',
            marginLeft: 'auto',
            borderRadius: '50%',
            marginRight: 'auto'
        };
        // @ts-ignore: Object is possibly 'null'.
        const cuser = database.fireapp.auth().currentUser;
        if (cuser && cuser.uid == this.props.match.params.uid) {
            let match = this.props.match;
            if (!this.state.error) {
                return (
                    <div>
                        <ul className="nav nav-pills nav-fill">
                            <li className="nav-item">
                                <Link className="nav-link" to={`/dashboard/${match.params.uid}`}>Profile</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to={`${match.url}/accept`}>Accept Contracts</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to={`${match.url}/create`}>Create Contracts</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to={`${match.url}/review`}>Active Contracts</Link>
                            </li>
                        </ul>
                        <div className="jumbotron jumbotron-fluid">
                            <div className="container" style={{ textAlign: 'center' }}>
                                <img src={this.state.info?.photo} style={photoStyle} />
                                <h1 className="display-4">

                                    {this.state.info?.name || "unknown"}
                                </h1>
                                <p className="lead">Welcome to your dashboard. This is where you manage your profile and contracts. Keep a close eye on that score!</p>
                            </div>
                        </div>

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
                    <div className="jumbotron jumbotron-fluid">
                        <div className="container" style={{ textAlign: 'center' }}>
                            <img src={this.state.info?.photo} style={photoStyle} />
                            <h1 className="display-4">
                                {this.state.info?.name || "unknown"}
                            </h1>
                            <p className="lead">{this.state.info?.bio}</p>
                        </div>
                    </div>
                    <div>
                        <UserInformation user={this.props.match.params.uid} editible={false} />
                    </div>
                </div>
            );
        }
    }
}

export { Dashboard };
