import React from 'react';
import { useParams } from 'react-router-dom';

export class Contract extends React.Component {
    render() {
        let { contractId } = useParams();
        return <h3>Requested contract ID: {contractId}</h3>;
    }
}

