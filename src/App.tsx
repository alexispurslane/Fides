import React from 'react';
import * as firebase from 'firebase/app';
import './App.css';
import * as database from './DataOperations';
import * as firebaseui from 'firebaseui'
import CSS from 'csstype';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
    useRouteMatch,
    RouteComponentProps,
    useParams
} from 'react-router-dom';

const fireui = new firebaseui.auth.AuthUI(database.fireapp.auth());

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

class SignOut extends React.Component<{ history?: any }> {
    signOut = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        database.fireapp.auth().signOut().then(() => {
            console.log("logged out");
            this.props.history.push('/');
        }).catch(e => {
            console.log(e);
        });
    }

    render() {
        return (
            <div>
                <h2>Are you sure you want to sign out?</h2>
                <button onClick={this.signOut}>Yes</button>
                <Link to="/dashboard">No</Link>
            </div>
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

class SignIn extends React.Component<{ history?: any }> {
    componentDidMount() {
        var _this = this;
        fireui.start('#firebaseui-auth-container', {
            callbacks: {
                signInSuccessWithAuthResult: (authResult, redirectUrl) => {
                    _this.props.history.push('/dashboard/' + authResult.user.uid);
                    if (authResult.additionalUserInfo.isNewUser) {
                        database.newPerson({
                            uid: "",
                            ratings: {},
                            score: 0.01,
                            metadata: {
                                name: authResult.user.displayName,
                                email: authResult.user.email,
                                photo: authResult.user.photoURL,
                            }
                        });
                    }
                    return false;
                },
            },
            // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
            signInFlow: 'popup',
            signInSuccessUrl: '/dashboard',
            signInOptions: [
                // Leave the lines as is for the providers you want to offer your users.
                firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                firebase.auth.EmailAuthProvider.PROVIDER_ID,
                firebase.auth.PhoneAuthProvider.PROVIDER_ID
            ],
            // Terms of service url.
            tosUrl: '<your-tos-url>',
            // Privacy policy url.
            privacyPolicyUrl: '<your-privacy-policy-url>'
        });
    }
    render() {
        const h1Style: CSS.Properties = { textAlign: "center" };
        return (
            <div>
                <h1 style={h1Style}>Sign In</h1>
                <div id="firebaseui-auth-container"></div>
            </div>
        );
    }
}

interface MatchParams {
    uid: string;
}

interface DashProps extends RouteComponentProps<MatchParams> {
    uid?: string
}

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

interface CCState {
    title: string,
    deadline: string,
    desc: string,
    userlist: [string | null, string | null],
    people: database.Person[],
}

class ContractCreator extends React.Component<{}, CCState> {
    constructor(props: {}) {
        super(props);

        this.state = {
            title: '',
            deadline: '',
            desc: '',
            userlist: [null, null],
            people: [],
        };
    }


    componentDidMount() {
        database.fireapp.database().ref('/people').on('value', snapshot => {
            let people: database.Person[] = [];
            snapshot.forEach(item => {
                people.push(item.val());
            })
            this.setState({ people: people });
        });
    }

    handleChange(event: any, data: string) {
        if (data == 'desc') {
            this.setState({ desc: event.target.value });
        } else if (data == 'title') {
            this.setState({ title: event.target.value });
        } else if (data == 'userlist') {
            this.setState({ userlist: event.target.value });
        } else if (data == 'deadline') {
            this.setState({ deadline: event.target.value });
        }
    }

    handleSubmit(event: any) {
        let c: database.Contract = {
            uniqid: "",
            title: this.state.title,
            deadline: new Date(this.state.deadline),
            desc: this.state.desc,
            people: {},
            roles: {}
        };
        // TODO: Make UI for selecting people to get their UID to associate via.
        database.newContract(c);
        event.preventDefault();
    }

    onPersonSelection = (ty: number, uid: string) => {
            this.setState(state => {
                let nl = state.userlist;
                const index = nl.indexOf(uid);
                if (index > -1) {
                    nl.splice(index, 1);
                }
                if (ty != -1) {
                    nl[ty] = uid;
                }
                return {
                    userlist: nl
                };
            });
        return false;
    }

    render() {
        // TODO: Get list of users, convert to little HTML elements with name
        // and avatar. Each one has a closure that captures it's uID attached to
        // onClick and when it's clicked it sets the 'selected user' to that ID.
        // Then when a button is cilcked, it'll be addded.
        return (
            <div>
                <h2>Create New Contract</h2>
                <form onSubmit={this.handleSubmit}>
                    <label>
                        <h3>Contract Title</h3>
                        <input type="text" placeholder="Buy me lunch"
                               value={this.state.title} onChange={e => this.handleChange(e, 'title')}/>
                    </label>
                    <br/>
                    <label>
                        <h3>Contract Description of Requirements</h3>
                        <textarea placeholder="Please deilver 93lbs of Sushi to my location (999 Insane Square)."
                                  value={this.state.desc} onChange={e => this.handleChange(e, 'desc')}/>
                    </label>
                    <br/>
                    <label>
                        <h3>Contract Deadline</h3>
                        <input type="date" value={this.state.deadline}
                               onChange={e => this.handleChange(e, 'deadline')}/>
                    </label>
                    <br/>
                    <label>
                        <h3>Other Participant (Prospective) and Arbitrator (Optional)</h3>
                        {this.state.people.map((p: database.Person) =>
                            <Person key={p.uid} data={p}
                                    selected={this.state.userlist.indexOf(p.uid)}
                                    selection={this.onPersonSelection} /> )}
                    </label>
                    <br/>
                    <input type="submit" value="Submit" />
                </form>
            </div>
        );
    }
}

function Person(props: { data: database.Person,
                         selected: number,
                         selection: (ty: number, uid: string) => boolean }) {
    function doTheThing(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, ty: number) {
        e.preventDefault();
        props.selection(ty, props.data.uid)
        console.log(ty);
    }
    const style: CSS.Properties = {
        backgroundColor: props.selected == 0 ? 'green' : props.selected == 1 ? 'red' : 'blue',
        color: props.selected == 0 ? 'black' : props.selected == 1 ? 'white' : 'white'
    };
    console.log("Selected: " + props.selected);
    return (
        <div style={style}>
            <label>
                <img width="30" src={props.data.metadata.photo} />
                {props.data.metadata.name}
            </label>
            <button key="other" onClick={e => doTheThing(e, 0)}>Other</button>
            <button key="arbitrator" onClick={e => doTheThing(e, 1)}>Arbitrator</button>
            <button key="deselect" onClick={e => doTheThing(e, -1)}>X</button>
        </div>
    );
}

class ContractAccept extends React.Component {
    render() {
        return (
            <div>
                <h2>Accept Contracts and Arbitration Requests</h2>
            </div>
        );
    }
}

class Rate extends React.Component {
    render() {
        return (
            <div>
                <h2>Rate People in Contracts</h2>
            </div>
        );
    }
}

class Contract extends React.Component {
    render() {
        let { contractId } = useParams();
        return <h3>Requested contract ID: {contractId}</h3>;
    }
}

export default App;
