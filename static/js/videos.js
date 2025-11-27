// Videos functionality
let currentVideoId = null;

// Upload Modal Functions
function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('uploadForm').reset();
}

function uploadVideo() {
    const form = document.getElementById('uploadForm');
    const formData = new FormData(form);

    const videoFile = document.getElementById('videoFile').files[0];
    if (!videoFile) {
        showNotification('Please select a video file', 'warning');
        return;
    }

    // Check file size (10GB limit)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB in bytes
    if (videoFile.size > maxSize) {
        showNotification('Video file size must be less than 10GB', 'error');
        return;
    }

    // Show loading state
    const uploadBtn = document.querySelector('#uploadModal .btn-primary');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;

    fetch('/api/videos', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            // Handle server-side file size errors
            if (response.status === 413) {
                throw new Error('File too large: Maximum size is 10GB');
            }
            return response.json().then(data => {
                throw new Error(data.error || 'Upload failed');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification('Video uploaded successfully!', 'success');
            closeUploadModal();
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showNotification('Error uploading video: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        showNotification('Error uploading video: ' + error.message, 'error');
    })
    .finally(() => {
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
    });
}

// Video Modal Functions
function openVideoModal(videoId) {
    currentVideoId = videoId;

    // Load video data
    fetch('/api/videos')
        .then(response => response.json())
        .then(data => {
            const video = data.videos.find(v => v.id === videoId);
            if (video) {
                // Set modal content
                document.getElementById('modalVideoTitle').textContent = video.title;
                document.getElementById('modalVideoDescription').textContent = video.description;
                document.getElementById('modalVideoViews').innerHTML = `<i class="fas fa-eye"></i> ${video.views} views`;
                document.getElementById('modalVideoDate').innerHTML = `<i class="fas fa-calendar"></i> ${new Date(video.upload_date).toLocaleDateString()}`;
                document.getElementById('modalLikes').textContent = video.likes;
                document.getElementById('modalDislikes').textContent = video.dislikes;

                // Set video source
                const videoPlayer = document.getElementById('modalVideoPlayer');
                videoPlayer.src = `/static/uploads/videos/${video.filename}`;

                // Load comments
                loadComments(video.comments);

                // Increment views
                incrementViews(videoId);

                // Show modal
                document.getElementById('videoModal').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error loading video:', error);
            alert('Error loading video');
        });
}

function closeVideoModal() {
    document.getElementById('videoModal').style.display = 'none';
    const videoPlayer = document.getElementById('modalVideoPlayer');
    videoPlayer.pause();
    videoPlayer.src = '';
    currentVideoId = null;
}

function loadComments(comments) {
    const commentsList = document.getElementById('commentsList');
    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No comments yet. Be the first to comment!</p>';
        return;
    }

    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">${comment.author || 'Anonymous'}</span>
                <span class="comment-time">${new Date(comment.timestamp).toLocaleString()}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
        </div>
    `).join('');
}

function addComment() {
    if (!currentVideoId) return;

    const author = document.getElementById('commentAuthor').value.trim() || 'Anonymous';
    const text = document.getElementById('commentText').value.trim();

    if (!text) {
        alert('Please enter a comment');
        return;
    }

    fetch(`/api/videos/${currentVideoId}/comment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            author: author,
            comment: text
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('commentText').value = '';
                document.getElementById('commentAuthor').value = '';

                // Reload comments
                fetch('/api/videos')
                    .then(response => response.json())
                    .then(videosData => {
                        const video = videosData.videos.find(v => v.id === currentVideoId);
                        if (video) {
                            loadComments(video.comments);
                        }
                    });
            } else {
                alert('Error adding comment: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error adding comment:', error);
            alert('Error adding comment');
        });
}

function reactToVideo(videoId, reaction) {
    fetch(`/api/videos/${videoId}/react`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reaction: reaction })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update UI
                const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
                if (videoCard) {
                    const likeBtn = videoCard.querySelector('.btn-like span');
                    const dislikeBtn = videoCard.querySelector('.btn-dislike span');

                    if (reaction === 'like') {
                        likeBtn.textContent = data.likes;
                    } else {
                        dislikeBtn.textContent = data.dislikes;
                    }
                }

                // Update modal if open
                if (currentVideoId === videoId) {
                    document.getElementById('modalLikes').textContent = data.likes;
                    document.getElementById('modalDislikes').textContent = data.dislikes;
                }
            }
        })
        .catch(error => {
            console.error('Error reacting to video:', error);
        });
}

function incrementViews(videoId) {
    fetch(`/api/videos/${videoId}/view`, {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update video card views
                const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
                if (videoCard) {
                    const viewsSpan = videoCard.querySelector('.video-stats span:first-child');
                    viewsSpan.innerHTML = `<i class="fas fa-eye"></i> ${data.views} views`;
                }
            }
        })
        .catch(error => {
            console.error('Error incrementing views:', error);
        });
}

function shareVideo(videoId) {
    const shareUrl = `${window.location.origin}/videos#video-${videoId}`;

    if (navigator.share) {
        navigator.share({
            title: 'BSABE Video',
            text: 'Check out this video from BSABE Department',
            url: shareUrl
        })
            .catch(error => console.log('Error sharing:', error));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareUrl)
            .then(() => alert('Video link copied to clipboard!'))
            .catch(() => {
                // Final fallback: show URL
                prompt('Copy this link to share:', shareUrl);
            });
    }
}

function deleteVideo(videoId) {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
        return;
    }

    fetch(`/api/videos?id=${videoId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error deleting video: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error deleting video:', error);
            alert('Error deleting video');
        });
}

// Set up video duration display
document.addEventListener('DOMContentLoaded', function () {
    // Add loadedmetadata event to all video thumbnails
    document.querySelectorAll('.video-thumbnail video').forEach(video => {
        video.addEventListener('loadedmetadata', function () {
            const duration = this.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            const durationElement = this.parentElement.querySelector('.video-duration');
            durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
    });

    // Set up modal reaction buttons
    document.getElementById('modalLikeBtn').addEventListener('click', function () {
        if (currentVideoId) {
            reactToVideo(currentVideoId, 'like');
        }
    });

    document.getElementById('modalDislikeBtn').addEventListener('click', function () {
        if (currentVideoId) {
            reactToVideo(currentVideoId, 'dislike');
        }
    });

    document.getElementById('modalShareBtn').addEventListener('click', function () {
        if (currentVideoId) {
            shareVideo(currentVideoId);
        }
    });
});