document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to unregister a participant
  function unregisterParticipant(activityName, email) {
      fetch(`/activities/${activityName}/unregister`, {
          method: 'DELETE',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email })
      })
      .then(response => response.json())
      .then(data => {
          if (data.message) {
              loadActivities(); // Reload activities after unregistering
          }
      })
      .catch(error => console.error('Error:', error));
  }

  // Function to load activities
  function loadActivities() {
      fetch('/activities')
          .then(response => response.json())
          .then(activities => {
              activitiesList.innerHTML = '';
              for (const [activityName, activity] of Object.entries(activities)) {
                  const activityDiv = document.createElement('div');
                  activityDiv.innerHTML = `<h4>${escapeHtml(activityName)}</h4><p>${escapeHtml(activity.description)}</p><p>Participants:</p><ul style='list-style-type: none;'>`;
                  activity.participants.forEach(participant => {
                      activityDiv.innerHTML += `<li>${escapeHtml(participant)} <button onclick="unregisterParticipant('${activityName}', '${escapeHtml(participant)}')">🗑️</button></li>`;
                  });
                  activityDiv.innerHTML += '</ul>';
                  activitiesList.appendChild(activityDiv);
              }
          })
          .catch(error => console.error('Error:', error));
  }

  loadActivities();

  // Helper: escape minimal HTML to avoid inyección accidental
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper: obtener iniciales para el avatar
  function getInitials(name) {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    const initials = parts.length === 1
      ? parts[0].slice(0, 2)
      : (parts[0][0] + parts[parts.length - 1][0]);
    return initials.toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Construir HTML de participantes
        const participantsHtml = Array.isArray(details.participants) && details.participants.length > 0
          ? `<ul>${details.participants.map(p => `<li><span class="avatar">${escapeHtml(getInitials(p))}</span><span class="name">${escapeHtml(p)}</span></li>`).join("")}</ul>`
          : `<div class="empty">Aún no hay participantes</div>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participantes</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Refresh activities to show the new participant
      await fetchActivities();

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
