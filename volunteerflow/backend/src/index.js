const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// ===== MOCK DATA =====
let volunteers = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-0001',
    skills: ['Leadership', 'Teaching'],
    hoursContributed: 45,
    status: 'ACTIVE',
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '555-0002',
    skills: ['Design', 'Communications'],
    hoursContributed: 32,
    status: 'ACTIVE',
  },
  {
    id: '3',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob@example.com',
    phone: '555-0003',
    skills: ['Coding', 'Leadership'],
    hoursContributed: 28,
    status: 'PENDING',
  },
];

let events = [
  {
    id: '1',
    title: 'Community Cleanup',
    description: 'Join us for a beach cleanup event to help keep our community clean and beautiful.',
    category: 'Environment',
    location: 'Santa Monica Beach',
    startDate: '2026-04-15T09:00:00Z',
    endDate: '2026-04-15T12:00:00Z',
    spotsAvailable: 20,
    status: 'UPCOMING',
  },
  {
    id: '2',
    title: 'Food Bank Drive',
    description: 'Help us distribute food and support families in need during this critical time.',
    category: 'Community Service',
    location: 'Downtown Center',
    startDate: '2026-04-20T10:00:00Z',
    endDate: '2026-04-20T14:00:00Z',
    spotsAvailable: 15,
    status: 'UPCOMING',
  },
  {
    id: '3',
    title: 'Teaching Workshop',
    description: 'Share your knowledge and teach kids basic coding skills in an interactive workshop.',
    category: 'Education',
    location: 'Tech Hub',
    startDate: '2026-05-01T14:00:00Z',
    endDate: '2026-05-01T17:00:00Z',
    spotsAvailable: 10,
    status: 'UPCOMING',
  },
];

let applications = [
  {
    id: '1',
    volunteerId: '1',
    eventId: '1',
    status: 'APPROVED',
    message: 'I would love to help with the beach cleanup!',
    createdAt: '2026-03-08T10:00:00Z',
  },
  {
    id: '2',
    volunteerId: '2',
    eventId: '2',
    status: 'PENDING',
    message: 'Count me in for the food drive!',
    createdAt: '2026-03-09T11:00:00Z',
  },
  {
    id: '3',
    volunteerId: '3',
    eventId: '3',
    status: 'APPROVED',
    message: 'Great opportunity to teach coding!',
    createdAt: '2026-03-09T12:00:00Z',
  },
];

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'VolunteerFlow API is running',
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'VolunteerFlow API v1.0.0',
    endpoints: ['/api/volunteers', '/api/events', '/api/applications', '/api/dashboard/stats'],
  });
});

// ===== VOLUNTEERS CRUD =====
app.get('/api/volunteers', (req, res) => {
  const { page = '1', limit = '10', search, status } = req.query;
  let filtered = [...volunteers];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (v) =>
        v.firstName.toLowerCase().includes(searchLower) ||
        v.lastName.toLowerCase().includes(searchLower) ||
        v.email.toLowerCase().includes(searchLower)
    );
  }

  if (status) {
    filtered = filtered.filter((v) => v.status === status);
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  const data = filtered.slice(skip, skip + limitNum);

  res.json({
    success: true,
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filtered.length,
      pages: Math.ceil(filtered.length / limitNum),
    },
  });
});

app.get('/api/volunteers/:id', (req, res) => {
  const volunteer = volunteers.find((v) => v.id === req.params.id);
  if (!volunteer)
    return res.status(404).json({ success: false, error: 'Volunteer not found' });
  res.json({ success: true, data: volunteer });
});

app.post('/api/volunteers', (req, res) => {
  const { firstName, lastName, email, phone, skills, status } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const volunteer = {
    id: Date.now().toString(),
    firstName,
    lastName,
    email,
    phone: phone || '',
    skills: skills || [],
    hoursContributed: 0,
    status: status || 'PENDING',
  };

  volunteers.push(volunteer);
  res.status(201).json({ success: true, data: volunteer, message: 'Volunteer created' });
});

app.put('/api/volunteers/:id', (req, res) => {
  const idx = volunteers.findIndex((v) => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Volunteer not found' });

  volunteers[idx] = { ...volunteers[idx], ...req.body };
  res.json({ success: true, data: volunteers[idx], message: 'Volunteer updated' });
});

app.delete('/api/volunteers/:id', (req, res) => {
  const idx = volunteers.findIndex((v) => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Volunteer not found' });

  volunteers.splice(idx, 1);
  res.json({ success: true, message: 'Volunteer deleted' });
});

// ===== EVENTS CRUD =====
app.get('/api/events', (req, res) => {
  const { page = '1', limit = '10', status, category } = req.query;
  let filtered = [...events];

  if (status) filtered = filtered.filter((e) => e.status === status);
  if (category) filtered = filtered.filter((e) => e.category === category);

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  const data = filtered.slice(skip, skip + limitNum).map((e) => ({
    ...e,
    participantCount: applications.filter(
      (a) => a.eventId === e.id && a.status === 'APPROVED'
    ).length,
    applicationCount: applications.filter((a) => a.eventId === e.id).length,
  }));

  res.json({
    success: true,
    data,
    pagination: { page: pageNum, limit: limitNum, total: filtered.length },
  });
});

app.get('/api/events/:id', (req, res) => {
  const event = events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

  const eventApplications = applications.filter((a) => a.eventId === event.id);

  res.json({
    success: true,
    data: {
      ...event,
      applications: eventApplications,
      stats: {
        participantCount: eventApplications.filter((a) => a.status === 'APPROVED').length,
        applicationCount: eventApplications.length,
        spotsRemaining: event.spotsAvailable - eventApplications.filter((a) => a.status === 'APPROVED').length,
      },
    },
  });
});

app.post('/api/events', (req, res) => {
  const { title, description, category, location, startDate, endDate, spotsAvailable, status } =
    req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const event = {
    id: Date.now().toString(),
    title,
    description,
    category,
    location: location || '',
    startDate,
    endDate,
    spotsAvailable: spotsAvailable || 10,
    status: status || 'UPCOMING',
  };

  events.push(event);
  res.status(201).json({ success: true, data: event, message: 'Event created' });
});

app.put('/api/events/:id', (req, res) => {
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Event not found' });

  events[idx] = { ...events[idx], ...req.body };
  res.json({ success: true, data: events[idx], message: 'Event updated' });
});

app.delete('/api/events/:id', (req, res) => {
  const idx = events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Event not found' });

  events.splice(idx, 1);
  applications = applications.filter((a) => a.eventId !== req.params.id);
  res.json({ success: true, message: 'Event deleted' });
});

// ===== APPLICATIONS CRUD =====
app.get('/api/applications', (req, res) => {
  const { page = '1', limit = '10', status, eventId, volunteerId } = req.query;
  let filtered = [...applications];

  if (status) filtered = filtered.filter((a) => a.status === status);
  if (eventId) filtered = filtered.filter((a) => a.eventId === eventId);
  if (volunteerId) filtered = filtered.filter((a) => a.volunteerId === volunteerId);

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  const data = filtered.slice(skip, skip + limitNum).map((a) => ({
    ...a,
    volunteer: volunteers.find((v) => v.id === a.volunteerId),
    event: events.find((e) => e.id === a.eventId),
  }));

  res.json({
    success: true,
    data,
    pagination: { page: pageNum, limit: limitNum, total: filtered.length },
  });
});

app.post('/api/applications', (req, res) => {
  const { volunteerId, eventId, message } = req.body;
  if (!volunteerId || !eventId) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const application = {
    id: Date.now().toString(),
    volunteerId,
    eventId,
    message: message || '',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  applications.push(application);
  res.status(201).json({ success: true, data: application, message: 'Application submitted' });
});

app.put('/api/applications/:id', (req, res) => {
  const idx = applications.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Application not found' });

  applications[idx] = { ...applications[idx], ...req.body };
  res.json({ success: true, data: applications[idx], message: 'Application updated' });
});

// ===== DASHBOARD STATS =====
app.get('/api/dashboard/stats', (req, res) => {
  const approvedApps = applications.filter((a) => a.status === 'APPROVED');
  const totalHours = volunteers.reduce((sum, v) => sum + v.hoursContributed, 0);

  res.json({
    success: true,
    data: {
      totalVolunteers: volunteers.length,
      activeVolunteers: volunteers.filter((v) => v.status === 'ACTIVE').length,
      totalHours,
      totalEvents: events.length,
      upcomingEvents: events.filter((e) => e.status === 'UPCOMING').length,
      totalApplications: applications.length,
      pendingApplications: applications.filter((a) => a.status === 'PENDING').length,
      approvedApplications: approvedApps.length,
      eventsByCategory: [...new Set(events.map((e) => e.category))].map((cat) => ({
        category: cat,
        count: events.filter((e) => e.category === cat).length,
      })),
    },
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log('\n✅ VolunteerFlow Backend Started!');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📊 Dashboard Stats: http://localhost:${PORT}/api/dashboard/stats`);
  console.log(`👥 Volunteers: http://localhost:${PORT}/api/volunteers`);
  console.log(`📅 Events: http://localhost:${PORT}/api/events`);
  console.log(`📋 Applications: http://localhost:${PORT}/api/applications\n`);
});