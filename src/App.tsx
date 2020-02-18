import React from 'react';
import * as database from './DataOperations';
import $ from 'jquery';
import CSS from 'csstype';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    RouteComponentProps,
    Link,
    matchPath,
    withRouter,
} from 'react-router-dom';
import * as firebase from 'firebase/app';
import { SignIn, SignOut } from './UserManagement';
import { Dashboard } from './Dashboard';

interface NavProps extends RouteComponentProps<any> {
    location: any
}

interface State {
    signedIn?: boolean
    uid?: string
}

class NavbarRaw extends React.Component<NavProps, State> {
    constructor(props: NavProps) {
        super(props);
        this.state = {
            uid: "",
            signedIn: false,
        };
    }

    componentDidMount() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.setState({ signedIn: true, uid: user.uid });
            } else {
                this.setState({ signedIn: false, uid: "" });
            }
        });
    }

    render() {
        const url = this.props.location.pathname;
        const actives = [
            (!!matchPath(url, '/contracts/:uniqid') ||
                !!matchPath(url, '/contracts')) ? 'active' : '',
            !!matchPath(url, '/users') ? 'active' : '',
            !!matchPath(url, '/dashboard/:uid') ? 'active' : '',
        ];
        const universals = [
            <li key="1" className="nav-item">
                <Link className={`nav-link ${actives[0]}`} to="/contracts">Contracts</Link>
            </li>,
            <li key="2" className="nav-item">
                <Link className={`nav-link ${actives[1]}`} to="/users">Users</Link>
            </li>
        ];
        const signedIn = [
            <ul key="1" className="navbar-nav">
                {universals}
                <li key="1" className="nav-item">
                    <Link className={`nav-link ${actives[2]}`} to={`/dashboard/${this.state.uid}`}>Dashboard</Link>
                </li>
            </ul>,
            <div key="2" className="form-inline ml-auto">
                <button className="btn btn-sm btn-outline-secondary" onClick={e => {
                    e.preventDefault();
                    $('#myModal').modal('show');
                    console.log($('#myModal'));
                }} type="button">Sign Out</button>
            </div>
        ];
        const signedOut = [
            <ul key="1" className="navbar-nav">
                {universals}
            </ul>,
            <div key="2" className="form-inline ml-auto">
                <Link className="btn btn-sm btn-outline-secondary" to="/signin">Sign In</Link>
            </div>
        ]
        return (
            this.state.signedIn ?
                signedIn :
                signedOut
        );
    }
}

const Navbar = withRouter(NavbarRaw);

function App() {
    return (
        <Router>
            <div>
                <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                    <Link className="navbar-brand" to="/">Fides</Link>
                    <button className="navbar-toggler navbar-right"
                        type="button" data-toggle="collapse"
                        data-target="#navbarNav" aria-controls="navbarNav"
                        aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <Navbar />
                    </div>
                </nav>
                <SignOut />
                <br />
                {/* A <Switch> looks through its children <Route>s and
                    renders the first one that matches the current URL. */}
                <div className="container">
                    <Switch>
                        <Route path="/signin" component={SignIn}></Route>
                        <Route path="/dashboard/:uid" component={Dashboard}></Route>
                        {/*
                        <Route path="/contracts" component={ViewContracts}></Route>
                        <Route path="/contracts/:uniqid" component={ViewContracts}></Route>
                        <Route path="/users" component={ViewDashboards}></Route>*/}
                        <Route path="/">
                            <div className="jumbotron">
                                <h1 className="display-4">Welcome to Fides</h1>
                                <p className="lead">An innovative, easy to use, distributed trust-tracking and arbitration app: so you always know if someone is trustworthy, no matter where they come from.</p>
                                <hr className="my-4" />
                                <p>If you already have an account, just sign in and/or go to your dashboard. Otherwise, please consider making an account!</p>
                                <p className="lead">
                                    <Link className="btn btn-primary btn-lg" to="/signin" role="button">Sign In or Sign Up</Link>
                                </p>
                            </div>
                        </Route>
                    </Switch>
                </div>
            </div>
        </Router>
    );
}

export default App;
