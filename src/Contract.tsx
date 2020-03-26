import React, { ChangeEvent } from 'react';
import * as database from './DataOperations';
import { Link } from 'react-router-dom';
import CSS from 'csstype';
import { UserAvatar } from './UserInformation';
import { Column, Row } from 'simple-flexbox';

interface ContractProps {
    data: database.Contract,
    currentUid?: string,
    full?: boolean,
    render?: (users: database.Person[]) => React.ReactNode,
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export class Contract extends React.Component<ContractProps, {
    users: { [uid: string]: database.Person },
    commentText: string,
}> {
    constructor(props: ContractProps) {
        super(props);
        this.state = {
            users: {},
            commentText: "",
        }
    }

    componentDidMount() {
        Object.values(this.props.data.people).forEach(contractEntry => {
            database.fireapp.database().ref('/people/' + contractEntry.uid)
                .orderByChild("metadata/name")
                .on('value', snapshot => {
                    this.setState(state => {
                        const users = Object.assign(
                            state.users,
                            { [contractEntry.uid]: snapshot.val() }
                        );
                        return {
                            users: users,
                        };
                    });
                });
        });

    }

    render() {
        const commentsSection = <CommentsSection
            uniqid={this.props.data.uniqid}
            list={this.props.data.comments} />;

        // @ts-ignore: Object is possibly 'null'.
        return (
            <div>
                <div className="card m-1">
                    <div className="card-body">
                        <h5 className="card-title">
                            {this.props.full
                                ? this.props.data.title
                                : <a href={"/contract/" + this.props.data.uniqid}>{this.props.data.title}</a>}
                        </h5>
                        <h6 className="card-subtitle mb-2 text-muted">{this.props.data.deadline}</h6>
                        <p className="card-text"> {this.props.data.desc} </p>
                        {this.props.full ? <ProofFilesUI uniqid={this.props.data.uniqid} /> : null}
                        {!!this.props.render
                            ? this.props.render(Object.values(this.state.users))
                            : this.props.children}
                    </div>
                    <ul className="list-group list-group-flush">
                        {Object.values(this.state.users).map(u => {
                            let udata = this.props.data.people[u.uid];
                            return <li key={u.uid} className="list-group-item">
                                <b>{capitalize(this.props.data.people[u.uid].role)}:&nbsp;</b>
                                <Link style={{ color: udata.accepted ? 'green' : 'red' }} to={`/dashboard/${u.uid}`}>{u.metadata.name}</Link>
                            </li>;
                        })}
                    </ul>

                    {this.props.full ? commentsSection : null}
                </div>
            </div>
        );
    }
}

function toFuzzyTime(milliseconds: number) {
    const times: { [key: string]: number } = {
        "years": (60000 * 60 * 24) * 30 * 12,
        "months": (60000 * 60 * 24) * 30,
        "days": 60000 * 60 * 24,
        "hours": 60000 * 60,
        "mins": 60000,
    };
    let fuzzy = [];
    for (let key in times) {
        const val = Math.floor(milliseconds / times[key]);
        if (val > 0) {
            fuzzy.push((val).toString() + " " + key);
        }
        milliseconds %= times[key];
        console.log(milliseconds);
    }
    return fuzzy.join(" and ") + " ago";
}

function autoGrow(el: any) {
    el.style.height = "55px";
    el.style.height = (el.scrollHeight) + "px";
}

interface PFUState {
    fileList: any[],
    bannerState: string,
    fileName: string | null
}

class ProofFilesUI extends React.Component<{ uniqid: string }, PFUState> {
    constructor(props: { uniqid: string }) {
        super(props);

        this.state = { fileList: [], bannerState: "none", fileName: null };
    }

    componentDidMount() {
        database.fireapp.storage().ref().child('/contracts/' + this.props.uniqid).listAll().then(list => {
            let urls = Promise.all(list.items.map((r: firebase.storage.Reference) => r.getDownloadURL()));
            let metadatas = Promise.all(list.items.map((r: firebase.storage.Reference) => r.getMetadata()));
            let promiseZip = Promise.all([urls, metadatas]);
            promiseZip.then(zip => {
                let nonPromiseZip = (zip as any)[0].map((url: string, i: number) =>
                    Object.assign((zip as any)[1][i], { url: url }));
                this.setState({ fileList: nonPromiseZip });
            });
        });
    }

    uploadProofFile = (e: ChangeEvent<HTMLInputElement>) => {
        var el = e.target as HTMLInputElement;
        if (el.files) {
            this.setState({ fileName: el.name });
            var storageRef = database.fireapp.storage().ref();
            for (let file of el.files) {
                var fileRef = storageRef.child("contracts/" + this.props.uniqid + "/" + file.name);
                fileRef.put(file).then(_fileSnap => {
                    this.setState({ bannerState: "success" });
                    setTimeout(_ => this.setState({ bannerState: "none" }), 5000);
                }).catch(reason => {
                    this.setState({ bannerState: reason });
                    setTimeout(_ => this.setState({ bannerState: "none" }), 5000);
                });
            }
        }
    }

    render() {
        const successBanner = (
            <div className="alert alert-success">
                <b>Success!</b> Your contract proof file has been uploaded to our servers, and should appear to the other users in a few minutes.
                Reload your page to see the new file listed.
                </div>
        );

        const failBanner = (
            <div className="alert alert-danger">
                <b>Error:</b> {this.state.bannerState}
            </div>
        );
        return (
            <div>
                <div className="input-group">
                    <div className="input-group-prepend">
                        <span className="input-group-text" id="inputGroupFileAddon01">Completion Proof</span>
                    </div>
                    <div className="custom-file">
                        <input type="file" className="custom-file-input" id="inputGroupFile01"
                            aria-describedby="inputGroupFileAddon01" accept="image/*,.pdf,.txt,.doc" onChange={this.uploadProofFile} />
                        <label className="custom-file-label" htmlFor="inputGroupFile01">{this.state.fileName || "Choose file..."}</label>
                    </div>
                </div>
                <br />
                {this.state.bannerState != "none" ? (this.state.bannerState == "success" ? successBanner : failBanner) : null}
                <hr />
                <table className="table">
                    <thead className="thead-dark">
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">File Name</th>
                            <th scope="col">Last Modified</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.fileList.map((file: any, i: number) => {
                            return (
                                <tr key={i}>
                                    <th scope="row">{i}</th>
                                    <td><a href={file.url}>{file.name}</a></td>
                                    <td>{file.updated}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }
}

interface CSProps {
    uniqid: string,
    list: { [id: string]: database.CommentEntry }
}

class CommentsSection extends React.Component<CSProps, { commentText: string }> {
    constructor(props: CSProps) {
        super(props);

        this.state = {
            commentText: ""
        }
    }

    makeComment = (_: any) => {
        if (database.fireapp.auth().currentUser) {
            let el = database.fireapp.database().ref('/contracts/' + this.props.uniqid + '/comments').push();
            database.fireapp.database().ref('/people/' + database.fireapp.auth().currentUser?.uid).on('value', userSnap => {
                el.set({
                    p: userSnap.val(),
                    comment: this.state.commentText,
                    date: (new Date()).toString()
                });
            });
            this.setState({ commentText: "" })
        } else {
            alert("You're not signed in!");
        }
    }

    render() {
        return (
            <div className="comments" style={{ backgroundColor: "#eff", }}>
                {Object.values(this.props.list || []).map((c: database.CommentEntry, i: number) =>
                    <Comment key={i} isPov={c.p.uid == database.fireapp.auth().currentUser?.uid} data={c} />)}
                <div className="input-group" style={{ padding: "15px 30px", width: "100%" }}>
                    <textarea value={this.state.commentText}
                        id="message"
                        className="form-control"
                        aria-label="Send message"
                        style={{ resize: "vertical", padding: "15px", maxHeight: "100px", height: "55px" }}
                        placeholder="Your message..."
                        onKeyPress={e => {
                            if (e.key == "Enter" && !e.shiftKey) {
                                this.makeComment(e);
                                e.preventDefault();
                            }
                        }}
                        onChange={e => {
                            autoGrow(e.target);
                            this.setState({ commentText: e.target.value });
                        }}></textarea>
                    <div className="input-group-append">
                        <button className="btn btn-outline-secondary" type="button" id="button-addon2"
                            onClick={this.makeComment}>Send</button>
                    </div>
                </div>
            </div>
        );
    }
}

function Comment(props: {
    data: database.CommentEntry,
    isPov: boolean
}) {
    const imageStyle: CSS.Properties = {
        float: 'left',
        width: '32px',
        borderRadius: '50%',
        height: '32px',
        marginRight: '10px',
        display: 'block'
    };
    const fuzzyTime = toFuzzyTime(new Date().getTime() - new Date(props.data.date).getTime());
    const user = (
        <Column key="user" alignItems="center" style={{ maxWidth: "80px" }}>
            <a href={`/dashboard/${props.data.p.uid}`}>
                <UserAvatar style={imageStyle}
                    avatar={props.data.p.metadata.photo} />
            </a>
            <p className="text-muted"><small>{fuzzyTime}</small></p>
        </Column>
    );
    const comment = (
        <Column key="comment" style={{
            padding: "10px 10px 10px 10px",
        }}
            flexBasis="40%"
            className={"talk-bubble tri-right " + (!props.isPov ? "left-top" : "right-top")} >
            {
                props.data.comment.split('\n').map((item, i) => {
                    return <span key={i}>{item}<br /></span>;
                })
            }
        </Column>
    );
    console.log(!props.isPov ? "flex-start" : "flex-end");
    return (
        <Row vertical='baseline'
            horizontal={!props.isPov ? "flex-start" : "flex-end"}
            style={{
                padding: "0px 30px",
            }} className="commentrow">
            {!props.isPov ? [user, comment] : [comment, user]}
        </Row>
    );
}
