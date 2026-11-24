import client from './client';

const data = (r) => r.data;

export const authApi = {
  config: () => client.get('/auth/config').then(data),
  me: () => client.get('/auth/me').then(r => r.data.user),
  login: (email, password) => client.post('/auth/login', { email, password }).then(data),
  demo: (role) => client.post('/auth/demo', { role }).then(data),
  logout: () => client.post('/auth/logout'),
  counts: () => client.get('/auth/counts').then(data),
};

export const teamsApi = {
  list: () => client.get('/teams').then(data),
  create: (name) => client.post('/teams', { name }).then(data),
  members: (teamId) => client.get(`/teams/${teamId}/members`).then(data),
  people: () => client.get('/teams/people/all').then(data),
  addMember: (fields) => client.post('/teams/members', fields).then(data),
  updateMember: (userId, fields) => client.patch(`/teams/members/${userId}`, fields).then(data),
  removeMember: (userId) => client.delete(`/teams/members/${userId}`),
};

export const boardsApi = {
  list: () => client.get('/boards').then(data),
  // { board, lists, tasks, people }
  get: (boardId) => client.get(`/boards/${boardId}`).then(data),
  create: (fields) => client.post('/boards', fields).then(data),
  update: (boardId, fields) => client.patch(`/boards/${boardId}`, fields).then(data),
  remove: (boardId) => client.delete(`/boards/${boardId}`),
  addList: (boardId, title) => client.post(`/boards/${boardId}/lists`, { title }).then(data),
  renameList: (listId, title) => client.patch(`/boards/lists/${listId}`, { title }).then(data),
  removeList: (listId) => client.delete(`/boards/lists/${listId}`),
};

// Every task mutation returns the full updated task
export const tasksApi = {
  mine: () => client.get('/tasks/mine').then(data),
  team: (teamId) => client.get('/tasks/team', { params: teamId ? { teamId } : {} }).then(data),
  create: (fields) => client.post('/tasks', fields).then(data),
  update: (taskId, fields) => client.patch(`/tasks/${taskId}`, fields).then(data),
  remove: (taskId) => client.delete(`/tasks/${taskId}`),
  addSubtask: (taskId, title) => client.post(`/tasks/${taskId}/subtasks`, { title }).then(data),
  updateSubtask: (taskId, subId, fields) => client.patch(`/tasks/${taskId}/subtasks/${subId}`, fields).then(data),
  removeSubtask: (taskId, subId) => client.delete(`/tasks/${taskId}/subtasks/${subId}`).then(data),
};

export const problemsApi = {
  list: (status) => client.get('/problems', { params: status ? { status } : {} }).then(data),
  create: (message, taskId) => client.post('/problems', { message, taskId: taskId || null }).then(data),
  setStatus: (id, status, resolutionNote) => client.patch(`/problems/${id}`, { status, resolutionNote }).then(data),
};

export const messagesApi = {
  inbox: () => client.get('/messages/inbox').then(data),
  sent: () => client.get('/messages/sent').then(data),
  send: (fields) => client.post('/messages', fields).then(data),
  markRead: (id) => client.post(`/messages/${id}/read`).then(data),
};

export const analyticsApi = {
  get: (teamId) => client.get('/analytics', { params: teamId ? { teamId } : {} }).then(data),
};
