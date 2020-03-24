import React from 'react';
import * as firebase from 'firebase/app';
import * as database from './DataOperations';
import * as firebaseui from 'firebaseui'
import CSS from 'csstype';

const fireui = new firebaseui.auth.AuthUI(database.fireapp.auth());

class SignOut extends React.Component<{ history?: any }, {}> {
    signOut(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): boolean {
        database.fireapp.auth().signOut().then(() => {
            console.log("logged out");
            window.location.href = "/";
        }).catch(e => {
            console.log(e);
        });
        return true;
    }

    render() {
        return (
            <div className="modal" role="dialog" id="myModal">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Are you sure you want to sign out?</h5>
                        </div>
                        <div className="modal-body">
                            <p>You can sign right back in anytime!</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-danger" data-dismiss="modal"
                                onClick={this.signOut.bind(this)}>Sign Out</button>
                            <button className="btn btn-secondary" data-dismiss="modal">Nevermind</button>
                        </div>
                    </div>
                </div>
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
                                bio: ""
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
