const planListEl = document.getElementById('planList');
const planForm = document.getElementById('planForm');
const toastEl = document.getElementById('toast');
const toggleMicBtn = document.getElementById('toggleMic');
const speechStatusText = document.getElementById('speechStatusText');
const speechStatusDot = document.getElementById('speechStatusDot');
const summarizeBtn = document.getElementById('summarizePlan');
const locationLabel = document.getElementById('locationLabel');
const weatherSummary = document.getElementById('weatherSummary');
const weatherMeta = document.getElementById('weatherMeta');
const timeSegmentEl = document.getElementById('timeSegment');
const interestForm = document.getElementById('interestForm');
const interestsInput = document.getElementById('interests');
const recommendationList = document.getElementById('recommendationList');
const recommendationContext = document.getElementById('recommendationContext');

let planItems = [];
let isListening = false;
let recognition;
let userCoordinates = null;
let recommendationState = null;
let toastTimeout;

async function fetchPlanItems() {
  const response = await fetch('/api/plan');
  if (!response.ok) {
    throw new Error('Failed to load plan items');
  }
  const data = await response.json();
  planItems = data.items || [];
  renderPlanItems();
}

function renderPlanItems() {
  planListEl.innerHTML = '';
  if (!planItems.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Your agenda is clear. Ask the assistant to add something to get started!';
    planListEl.appendChild(empty);
    return;
  }

  planItems
    .slice()
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
    .forEach((item) => {
      const article = document.createElement('article');
      article.className = `plan-item ${item.status === 'completed' ? 'completed' : ''}`;
      article.dataset.id = item.id;

      const header = document.createElement('header');
      const title = document.createElement('h3');
      title.textContent = item.title;
      header.appendChild(title);

      const timeRange = document.createElement('span');
      timeRange.className = 'time-range';
      timeRange.textContent = formatTimeRange(item.startTime, item.endTime);
      header.appendChild(timeRange);

      const controls = document.createElement('div');
      controls.className = 'controls';

      const statusBtn = document.createElement('button');
      statusBtn.type = 'button';
      statusBtn.dataset.action = 'toggle';
      statusBtn.textContent = item.status === 'completed' ? 'Mark active' : 'Mark done';
      controls.appendChild(statusBtn);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.dataset.action = 'remove';
      removeBtn.textContent = 'Remove';
      controls.appendChild(removeBtn);

      if (item.location) {
        const meta = document.createElement('div');
        meta.className = 'meta';
        const location = document.createElement('span');
        location.textContent = `📍 ${item.location}`;
        meta.appendChild(location);
        if (item.notes) {
          const notes = document.createElement('span');
          notes.textContent = `📝 ${item.notes}`;
          meta.appendChild(notes);
        }
        article.append(header, meta, controls);
      } else if (item.notes) {
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = `📝 ${item.notes}`;
        article.append(header, meta, controls);
      } else {
        article.append(header, controls);
      }

      planListEl.appendChild(article);
    });
}

function formatTimeRange(start, end) {
  if (!start && !end) return 'Anytime';
  if (start && !end) return `${formatTime(start)}`;
  if (!start && end) return `Before ${formatTime(end)}`;
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatTime(value) {
  if (!value) return '—';
  const [hourStr, minuteStr] = value.split(':');
  let hour = Number.parseInt(hourStr, 10);
  const minutes = Number.parseInt(minuteStr, 10) || 0;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minutes.toString().padStart(2, '0')} ${suffix}`;
}

async function createPlanItem(payload) {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Unable to create plan item');
  }
  const data = await response.json();
  planItems.push(data.item);
  renderPlanItems();
  return data.item;
}

async function updatePlanItem(id, updates) {
  const response = await fetch(`/api/plan/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Unable to update plan item');
  }
  const data = await response.json();
  const index = planItems.findIndex((item) => item.id === id);
  if (index !== -1) {
    planItems[index] = data.item;
    renderPlanItems();
  }
  return data.item;
}

async function removePlanItem(id) {
  const response = await fetch(`/api/plan/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Unable to remove plan item');
  }
  planItems = planItems.filter((item) => item.id !== id);
  renderPlanItems();
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3200);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function parseTimeFromSpeech(timeString) {
  const match = timeString.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let [_, hourStr, minuteStr = '00', meridiem] = match;
  let hour = Number.parseInt(hourStr, 10);
  const minutes = Number.parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minutes)) return null;
  if (meridiem) {
    const lower = meridiem.toLowerCase();
    if (lower === 'pm' && hour < 12) hour += 12;
    if (lower === 'am' && hour === 12) hour = 0;
  }
  if (hour < 0 || hour > 23) return null;
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function handleVoiceCommand(transcript) {
  const text = transcript.toLowerCase();
  console.log('[voice]', text);

  const addMatch = text.match(/(?:add|schedule|plan)\s+(.*?)(?:\s+at\s+|\s+for\s+)([^.]+)/i);
  if (addMatch) {
    const title = addMatch[1].trim();
    const time = parseTimeFromSpeech(addMatch[2]);
    if (!time) {
      showToast('Heard an add command but could not understand the time.');
      speak('I could not understand the time for that task.');
      return;
    }
    try {
      const item = await createPlanItem({ title, startTime: time });
      showToast(`Added ${item.title} at ${formatTime(time)}`);
      speak(`Added ${item.title} at ${formatTime(time)}`);
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const removeMatch = text.match(/(?:remove|delete|cancel)\s+(?:the\s+)?(.+)/);
  if (removeMatch) {
    const targetTitle = removeMatch[1].trim();
    const item = planItems.find((entry) => entry.title.toLowerCase().includes(targetTitle));
    if (!item) {
      showToast(`I couldn't find ${targetTitle} in your plan.`);
      speak(`I couldn't find ${targetTitle} in your plan.`);
      return;
    }
    await removePlanItem(item.id);
    showToast(`Removed ${item.title}.`);
    speak(`Removed ${item.title}.`);
    return;
  }

  const completeMatch = text.match(/(?:complete|finish|done|check off)\s+(?:the\s+)?(.+)/);
  if (completeMatch) {
    const target = completeMatch[1].trim();
    const item = planItems.find((entry) => entry.title.toLowerCase().includes(target));
    if (!item) {
      showToast(`I couldn't find ${target} to complete.`);
      speak(`I couldn't find ${target}.`);
      return;
    }
    const newStatus = item.status === 'completed' ? 'scheduled' : 'completed';
    await updatePlanItem(item.id, { status: newStatus });
    const label = newStatus === 'completed' ? 'completed' : 'reactivated';
    showToast(`${item.title} ${label}.`);
    speak(`${item.title} ${label}.`);
    return;
  }

  if (text.includes('summary') || text.includes("what's my plan") || text.includes('summarize')) {
    speakPlanSummary();
    return;
  }

  showToast(`I heard “${transcript}” but didn't recognise a command.`);
}

function speakPlanSummary() {
  if (!planItems.length) {
    const message = 'Your day is empty. Ask me to add something to get going.';
    showToast(message);
    speak(message);
    return;
  }
  const completed = planItems.filter((item) => item.status === 'completed').length;
  const upcoming = planItems.filter((item) => item.status !== 'completed');
  const nextItem = upcoming.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))[0];
  const messageParts = [`You have ${planItems.length} items today.`];
  if (completed) {
    messageParts.push(`${completed} completed so far.`);
  }
  if (nextItem) {
    messageParts.push(`Next up is ${nextItem.title} at ${formatTime(nextItem.startTime)}.`);
  }
  const message = messageParts.join(' ');
  showToast(message);
  speak(message);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    speechStatusText.textContent = 'Voice control not supported in this browser';
    toggleMicBtn.disabled = true;
    speechStatusDot.classList.remove('live');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.addEventListener('result', (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(' ')
      .trim();
    if (transcript) {
      handleVoiceCommand(transcript);
    }
  });

  recognition.addEventListener('start', () => {
    speechStatusText.textContent = 'Listening…';
    speechStatusDot.classList.add('live');
    toggleMicBtn.textContent = 'Stop listening';
    toggleMicBtn.setAttribute('aria-pressed', 'true');
  });

  recognition.addEventListener('end', () => {
    speechStatusText.textContent = 'Voice control ready';
    speechStatusDot.classList.remove('live');
    toggleMicBtn.textContent = 'Start listening';
    toggleMicBtn.setAttribute('aria-pressed', 'false');
    if (isListening) {
      recognition.start();
    }
  });

  recognition.addEventListener('error', (event) => {
    console.error('Speech recognition error', event.error);
    showToast(`Speech recognition error: ${event.error}`);
  });
}

function toggleListening() {
  if (!recognition) return;
  if (isListening) {
    isListening = false;
    recognition.stop();
  } else {
    isListening = true;
    recognition.start();
  }
}

async function requestLocation() {
  if (!navigator.geolocation) {
    locationLabel.textContent = 'Geolocation unavailable in this browser';
    return;
  }
  locationLabel.textContent = 'Locating you…';
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userCoordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      locationLabel.textContent = `Lat ${userCoordinates.lat.toFixed(2)}, Lon ${userCoordinates.lon.toFixed(2)}`;
      await refreshContext();
    },
    (error) => {
      console.warn('Geolocation error', error);
      locationLabel.textContent = 'Location access denied.';
      recommendationContext.textContent = 'Share your location to see nearby suggestions.';
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

async function refreshContext(customInterests) {
  if (!userCoordinates) return;
  const params = new URLSearchParams({
    lat: userCoordinates.lat,
    lon: userCoordinates.lon
  });
  if (customInterests) {
    params.set('interests', customInterests);
  }

  try {
    const [weatherRes, recommendationsRes] = await Promise.all([
      fetch(`/api/weather?${params}`),
      fetch(`/api/recommendations?${params}`)
    ]);

    if (weatherRes.ok) {
      const weatherData = await weatherRes.json();
      const { weather, timeOfDay } = weatherData;
      weatherSummary.textContent = `${weather.condition} • ${weather.temperature}°${weather.unit}`;
      weatherMeta.textContent = `Humidity ${weather.humidity}% · Wind ${weather.windKph} kph`;
      timeSegmentEl.textContent = timeOfDay.replace('-', ' ');
    }

    if (recommendationsRes.ok) {
      const recommendationData = await recommendationsRes.json();
      recommendationState = recommendationData;
      updateRecommendationUI(recommendationData);
    }
  } catch (error) {
    console.error('Context refresh failed', error);
    showToast('Unable to refresh local insights right now.');
  }
}

function updateRecommendationUI(data) {
  if (!data) return;
  const { city, distance, activities } = data;
  locationLabel.textContent = `Near ${city} · ${distance} km away`;
  recommendationContext.textContent = `${city} • best for ${data.timeOfDay.replace('-', ' ')} • ${data.weather.condition.toLowerCase()}`;
  recommendationList.innerHTML = '';
  if (!activities.length) {
    const empty = document.createElement('li');
    empty.className = 'meta';
    empty.textContent = 'No curated ideas available for the selected interests.';
    recommendationList.appendChild(empty);
    return;
  }

  activities.forEach((activity) => {
    const li = document.createElement('li');
    li.className = 'recommendation-card';

    const title = document.createElement('h4');
    title.textContent = activity.title;
    li.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = activity.description;
    li.appendChild(desc);

    const tags = document.createElement('div');
    tags.className = 'tags';
    const detailTags = [...(activity.tags || []), `${activity.duration} mins`, activity.location];
    detailTags.forEach((tag) => {
      const span = document.createElement('span');
      span.textContent = tag;
      tags.appendChild(span);
    });
    li.appendChild(tags);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Add to plan';
    button.addEventListener('click', async () => {
      const startTime = suggestStartTime();
      const payload = {
        title: activity.title,
        startTime,
        notes: activity.description,
        location: `${activity.city} · ${activity.location}`
      };
      try {
        await createPlanItem(payload);
        showToast(`Added ${activity.title} at ${formatTime(startTime)}`);
        speak(`${activity.title} added to your plan.`);
      } catch (error) {
        showToast(error.message);
      }
    });
    li.appendChild(button);

    recommendationList.appendChild(li);
  });
}

function suggestStartTime() {
  const next = new Date();
  next.setMinutes(next.getMinutes() + 30);
  const roundedMinutes = Math.ceil(next.getMinutes() / 15) * 15;
  if (roundedMinutes >= 60) {
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
  } else {
    next.setMinutes(roundedMinutes);
  }
  const hours = next.getHours().toString().padStart(2, '0');
  const minutes = next.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

planForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(planForm);
  const payload = Object.fromEntries(formData.entries());
  if (!payload.title || !payload.startTime) {
    showToast('Title and start time are required.');
    return;
  }
  try {
    const item = await createPlanItem(payload);
    showToast(`Added ${item.title}`);
    planForm.reset();
  } catch (error) {
    showToast(error.message);
  }
});

planListEl.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const article = button.closest('.plan-item');
  if (!article) return;
  const id = article.dataset.id;
  const item = planItems.find((entry) => entry.id === id);
  if (!item) return;

  if (button.dataset.action === 'toggle') {
    const newStatus = item.status === 'completed' ? 'scheduled' : 'completed';
    await updatePlanItem(id, { status: newStatus });
    showToast(
      newStatus === 'completed'
        ? `${item.title} marked complete.`
        : `${item.title} re-opened.`
    );
  }

  if (button.dataset.action === 'remove') {
    await removePlanItem(id);
    showToast(`${item.title} removed.`);
  }
});

summarizeBtn.addEventListener('click', (event) => {
  event.preventDefault();
  speakPlanSummary();
});

toggleMicBtn.addEventListener('click', (event) => {
  event.preventDefault();
  toggleListening();
});

interestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const interests = interestsInput.value
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!userCoordinates) {
    showToast('Share your location first to fetch recommendations.');
    return;
  }
  const params = interests.join(',');
  await refreshContext(params);
  if (interests.length) {
    showToast(`Updated ideas for ${interests.join(', ')}`);
  } else {
    showToast('Showing general ideas nearby.');
  }
});

function init() {
  setupSpeechRecognition();
  fetchPlanItems().catch((error) => {
    console.error(error);
    showToast('Unable to load your plan.');
  });
  requestLocation();
}

init();
