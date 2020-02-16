import React, { FormEvent } from 'react';
import './App.css';
import * as database from './DataOperations';
import CSS from 'csstype';

interface UIProps {
    user: string,
    editible: boolean
}

interface UIState {
    info?: { name: string, photo: string, email: string, bio?: string, score: number },
    showBanner: boolean
}

export class UserInformation extends React.Component<UIProps, UIState> {
    constructor(props: UIProps) {
        super(props);
        this.state = { showBanner: false };
    }

    componentDidMount() {
        database.fireapp.database()
            .ref('/people/' + this.props.user).on('value', snapshot => {
                this.setState({ info: Object.assign(snapshot.val().metadata, { score: snapshot.val().score }) });
            })
    }

    handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        database.fireapp.database().ref('/people/' + this.props.user + '/metadata').set(this.state.info);
        this.setState({ showBanner: true });
        setTimeout(_ => this.setState({ showBanner: false }), 3500);
    }
    handleChange(event: any, data: string) {
        this.setState({
            info: Object.assign(this.state.info, { [data]: event.target.value })
        });
    }

    render() {
        const inputStyle: CSS.Properties = {
            float: 'right'
        };
        const groupStyle: CSS.Properties = {
            display: 'block',
            height: '50px'
        };
        let internals = (
            <form onSubmit={this.handleSubmit}>
                <label style={groupStyle}>
                    Display Name:
                    <input type="text" placeholder="Display Name"
                        style={inputStyle}
                        value={this.state.info?.name} onChange={e => this.handleChange(e, 'name')} />
                </label>
                <br />
                <label style={groupStyle}>
                    Email Address:
                <input type="email" placeholder="Email Address"
                        style={inputStyle}
                        value={this.state.info?.email} onChange={e => this.handleChange(e, 'email')} />
                </label>
                <br />
                <label style={groupStyle}>
                    Avatar URL:
                    <input type="url" placeholder="Avatar URL"
                        style={inputStyle}
                        value={this.state.info?.photo} onChange={e => this.handleChange(e, 'photo')} />
                </label>
                <br />
                <label>
                    <h3>User Bio</h3>
                    <textarea placeholder="I am an elephant" style={{ marginBottom: '22px', width: '100%' }}
                        value={this.state.info?.bio}
                        onChange={e => this.handleChange(e, 'bio')}>
                    </textarea>
                </label>
                <br />
                <input style={{ margin: '0 auto', display: 'block' }}
                    type="submit" value="Submit" />
                {this.state.showBanner ?
                    <p style={{ backgroundColor: 'green', color: 'white' }}>Submitted!</p> : null}
            </form>);
        if (!this.props.editible) {
            internals = (
                <div>
                    <div>
                        <label style={groupStyle}>
                            Display Name:
                    <p style={inputStyle}>{this.state.info?.name}</p>
                        </label>
                        <br />
                        <label style={groupStyle}>
                            Email Address:
                    <p style={inputStyle}>{this.state.info?.email}</p>
                        </label>
                        <br />
                        <label style={groupStyle}>
                            Avatar URL:
                    <p style={inputStyle}>{this.state.info?.photo}</p>
                        </label>
                        <br />
                        <label>
                            <h3>User Bio</h3>
                            <p>{this.state.info?.bio}</p>
                        </label>
                    </div>
                </div>
            )
        }
        return (
            <div style={{ margin: '10px auto', width: '80%' }}>
                <h2 style={{ textAlign: 'center' }}>User Bio</h2>
                {internals}
            </div>
        );
    }
}
