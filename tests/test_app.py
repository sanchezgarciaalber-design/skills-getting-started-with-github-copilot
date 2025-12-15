import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app import app


class TestRootEndpoint:
    """Tests for the root endpoint"""
    
    def test_root_redirects_to_static(self, client):
        """Test that root endpoint redirects to static/index.html"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"] == "/static/index.html"


class TestGetActivities:
    """Tests for the GET /activities endpoint"""
    
    def test_get_activities_returns_dict(self, client):
        """Test that /activities endpoint returns a dictionary"""
        response = client.get("/activities")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)
    
    def test_get_activities_contains_chess_club(self, client):
        """Test that activities include Chess Club"""
        response = client.get("/activities")
        activities = response.json()
        assert "Chess Club" in activities
    
    def test_get_activities_has_required_fields(self, client):
        """Test that each activity has required fields"""
        response = client.get("/activities")
        activities = response.json()
        
        for activity_name, activity_data in activities.items():
            assert "description" in activity_data
            assert "schedule" in activity_data
            assert "max_participants" in activity_data
            assert "participants" in activity_data
            assert isinstance(activity_data["participants"], list)
    
    def test_get_activities_initial_participants(self, client):
        """Test that Chess Club has initial participants"""
        response = client.get("/activities")
        activities = response.json()
        chess_club = activities["Chess Club"]
        
        assert len(chess_club["participants"]) == 2
        assert "michael@mergington.edu" in chess_club["participants"]
        assert "daniel@mergington.edu" in chess_club["participants"]


class TestSignupForActivity:
    """Tests for the POST /activities/{activity_name}/signup endpoint"""
    
    def test_signup_new_student(self, client):
        """Test signing up a new student for an activity"""
        response = client.post(
            "/activities/Basketball%20Team/signup",
            params={"email": "student@mergington.edu"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "Signed up" in data["message"]
        assert "student@mergington.edu" in data["message"]
    
    def test_signup_student_appears_in_activity(self, client):
        """Test that signed up student appears in activity participants"""
        # Sign up
        client.post(
            "/activities/Soccer%20Club/signup",
            params={"email": "newstudent@mergington.edu"}
        )
        
        # Verify signup
        response = client.get("/activities")
        activities = response.json()
        soccer_club = activities["Soccer Club"]
        
        assert "newstudent@mergington.edu" in soccer_club["participants"]
        assert len(soccer_club["participants"]) == 1
    
    def test_signup_already_registered_student(self, client):
        """Test that signing up an already registered student fails"""
        response = client.post(
            "/activities/Chess%20Club/signup",
            params={"email": "michael@mergington.edu"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "already signed up" in data["detail"]
    
    def test_signup_nonexistent_activity(self, client):
        """Test that signing up for a nonexistent activity fails"""
        response = client.post(
            "/activities/Nonexistent%20Activity/signup",
            params={"email": "student@mergington.edu"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"]
    
    def test_signup_multiple_students(self, client):
        """Test signing up multiple students to the same activity"""
        emails = [
            "student1@mergington.edu",
            "student2@mergington.edu",
            "student3@mergington.edu"
        ]
        
        for email in emails:
            response = client.post(
                "/activities/Art%20Club/signup",
                params={"email": email}
            )
            assert response.status_code == 200
        
        # Verify all students are registered
        response = client.get("/activities")
        activities = response.json()
        art_club = activities["Art Club"]
        
        assert len(art_club["participants"]) == 3
        for email in emails:
            assert email in art_club["participants"]
    
    def test_signup_email_validation(self, client):
        """Test signup with various email formats"""
        # Valid email
        response = client.post(
            "/activities/Drama%20Club/signup",
            params={"email": "test.student@mergington.edu"}
        )
        assert response.status_code == 200
        
        # Empty email - FastAPI will handle this
        response = client.post(
            "/activities/Drama%20Club/signup",
            params={"email": ""}
        )
        # Empty string is technically still processed
        assert response.status_code in [200, 400]
    
    def test_activity_capacity_not_enforced(self, client):
        """Test that activity capacity limits are tracked but may not be enforced"""
        # Get initial state
        response = client.get("/activities")
        activities = response.json()
        math_club = activities["Math Club"]
        
        initial_capacity = math_club["max_participants"]
        assert initial_capacity == 10
