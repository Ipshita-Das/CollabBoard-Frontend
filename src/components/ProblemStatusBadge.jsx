import { CircleAlert, CircleCheck } from 'lucide-react';

const ProblemStatusBadge = ({ status }) => (
  status === 'resolved'
    ? <span className="badge badge-success"><CircleCheck size={11} /> Resolved</span>
    : <span className="badge badge-warn"><CircleAlert size={11} /> Open</span>
);

export default ProblemStatusBadge;
