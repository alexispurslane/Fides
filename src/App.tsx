import React from 'react';
import * as database from './DataOperations';
import CSS from 'csstype';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
} from 'react-router-dom';
import * as firebase from 'firebase/app';
import { SignIn, SignOut } from './UserManagement';
import { Dashboard } from './Dashboard';

interface State {
    signedIn?: boolean
    uid?: string
}

class Navbar extends React.Component<{}, State> {
    constructor(props: {}) {
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
        let signedInOptions = [
            <li key="1" className="nav-item">
                <Link className="nav-link" to={`/dashboard/${this.state.uid}`}>Dashboard</Link>
            </li>,
            <li key="2" className="nav-item">
                <Link className="nav-link" to="/signout">Sign Out</Link>
            </li>
        ];
        return (
            <ul className="navbar-nav">
                {this.state.signedIn ?
                    signedInOptions :
                    (<li className="nav-item">
                        <Link className="nav-link" to="/signin">Sign In</Link>
                    </li>)}
            </ul>
        );
    }
}

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
                <br />

                {/* A <Switch> looks through its children <Route>s and
                    renders the first one that matches the current URL. */}
                <div className="container">
                    <Switch>
                        <Route path="/signin" component={SignIn}></Route>
                        <Route path="/dashboard/:uid" component={Dashboard}></Route>
                        <Route path="/signout" component={SignOut}></Route>
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
