import React from 'react';
import * as firebase from 'firebase/app';
import * as database from './DataOperations';
import * as firebaseui from 'firebaseui'
import CSS from 'csstype';
import { Link } from 'react-router-dom';

const fireui = new firebaseui.auth.AuthUI(database.fireapp.auth());

class SignOut extends React.Component<{ history?: any }, {}> {
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

export { SignIn, SignOut };
