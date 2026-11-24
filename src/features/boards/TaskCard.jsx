import { Calendar, ListChecks, CircleCheck, Circle } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { isOverdue, formatDue, priorityStyle } from '../../utils/taskHelpers';

// onToggleComplete is only passed when the current user may complete this task.
// draggable is only set for managers.
const TaskCard = ({ task, isMine, onOpen, onToggleComplete, draggable, onDragStart, onDragEnd, isDragging }) => {
  const priority = priorityStyle(task.priority);
  const overdue = isOverdue(task);
  const subtasks = task.subtasks || [];
  const subtasksDone = subtasks.filter(st => st.done).length;

  return (
    <div
      className={`task-card ${task.completed ? 'is-complete' : ''} ${isMine ? 'is-mine' : ''} ${isDragging ? 'is-dragging' : ''}`}
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`Open task ${task.title}`}
    >
      <div className="task-card-top">
        {onToggleComplete ? (
          <button
            type="button"
            className={`task-check ${task.completed ? 'is-done' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={task.completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
            title={task.completed ? 'Mark as not done' : 'Mark as done'}
          >
            {task.completed ? <CircleCheck size={17} /> : <Circle size={17} />}
          </button>
        ) : task.completed ? (
          <CircleCheck size={15} className="task-done-icon" />
        ) : null}
        <h4>{task.title}</h4>
      </div>
      {task.description && <p>{task.description}</p>}
      <div className="task-meta">
        {isMine && <span className="badge badge-brand">You</span>}
        {priority && <span className={`badge ${priority.badge}`}>{priority.label}</span>}
        {task.dueDate && (
          <span className={`badge ${overdue ? 'badge-danger' : ''}`} title={overdue ? 'Overdue' : 'Deadline'}>
            <Calendar size={11} />
            {formatDue(task.dueDate)}
          </span>
        )}
        {subtasks.length > 0 && (
          <span className={`badge ${subtasksDone === subtasks.length ? 'badge-success' : ''}`}>
            <ListChecks size={11} />
            {subtasksDone}/{subtasks.length}
          </span>
        )}
        {task.assignee ? <Avatar name={task.assignee.name} size="sm" /> : <span className="unassigned-dot" title="Unassigned">?</span>}
      </div>
    </div>
  );
};

export default TaskCard;
