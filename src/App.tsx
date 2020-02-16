import React from 'react';
import './App.css';
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
            <li key="1"><Link to={`/dashboard/${this.state.uid}`}>Dashboard</Link></li>,
            <li key="2"><Link to="/signout">Sign Out</Link></li>
        ];
        return (
            <ul>
                <li><Link to="/">Home</Link></li>
                {this.state.signedIn ?
                 signedInOptions :
                 <li><Link to="/signin">Sign In</Link></li>}
            </ul>
        );
    }
}

function App() {
    return (
        <Router>
            <div>
                <nav>
                    <Navbar />
                    <hr/>
                </nav>

                {/* A <Switch> looks through its children <Route>s and
                    renders the first one that matches the current URL. */}
                    <Switch>
                        <Route path="/signin" component={SignIn}></Route>
                        <Route path="/dashboard/:uid" component={Dashboard }></Route>
                        <Route path="/signout" component={SignOut }></Route>
                        <Route path="/">
                            <h1>Welcome to Fides! Sign In or go to the Dashboard</h1>
                        </Route>
                    </Switch>
            </div>
        </Router>
    );
}

export default App;
