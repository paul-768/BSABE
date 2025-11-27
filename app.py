from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import os
import re
import uuid

from datetime import datetime
from typing import List, Dict, Any
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# Increase maximum file size to 10GB (10 * 1024 * 1024 * 1024 bytes)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 * 1024  # 10GB


# Default admin credentials
ADMIN_USERNAME = "bsabepontevedra2025"
ADMIN_PASSWORD = "AACUPSURVEYVISIT2025"

# Data file path
DATA_FILE = "data/cards.json"
VIDEO_DATA_FILE = "data/videos.json"

# Global variable for search index
search_index = {}

def load_cards():
    """Load cards data from JSON file"""
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Return default structure if file doesn't exist
        return {"cards": []}

def save_cards(data):
    """Save cards data to JSON file"""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def build_search_index(cards_data):
    """Build search index for all cards"""
    global search_index
    search_index = {}
    
    def index_card(card, path=""):
        card_path = f"{path}/{card['name']}" if path else card['name']
        
        # Index card name and subtitle
        content = f"{card['name']} {card.get('subtitle', '')}".lower()
        words = re.findall(r'\b\w+\b', content)
        
        for word in words:
            if len(word) > 2:  # Only index words longer than 2 characters
                if word not in search_index:
                    search_index[word] = []
                search_index[word].append({
                    'id': card['id'],
                    'name': card['name'],
                    'subtitle': card.get('subtitle', ''),
                    'type': card['type'],
                    'path': card_path
                })
        
        # Index children recursively
        if card.get('children'):
            for child in card['children']:
                index_card(child, card_path)
    
    for card in cards_data.get('cards', []):
        index_card(card)
    
    return search_index

def search_cards(query: str, cards_data: Dict) -> List[Dict]:
    """Search cards using the search index"""
    if not query or len(query.strip()) < 2:
        return []
    
    query = query.lower().strip()
    query_words = re.findall(r'\b\w+\b', query)
    
    if not query_words:
        return []
    
    # Build index if empty
    if not search_index:
        build_search_index(cards_data)
    
    results = []
    found_ids = set()
    
    # Search for each word in the query
    for word in query_words:
        if word in search_index:
            for card_info in search_index[word]:
                if card_info['id'] not in found_ids:
                    results.append(card_info)
                    found_ids.add(card_info['id'])
    
    # Sort by relevance (more matching words = higher relevance)
    def relevance_score(card_info):
        score = 0
        card_content = f"{card_info['name']} {card_info.get('subtitle', '')}".lower()
        for word in query_words:
            if word in card_content:
                score += 1
            # Bonus points for exact matches
            if query in card_content:
                score += 3
        return score
    
    results.sort(key=relevance_score, reverse=True)
    return results[:20]  # Limit results

def render_card_html(card, is_admin, parent_id=None):
    """Recursively render card HTML with full functionality"""
    card_class = "file-card" if card['type'] == 'file' else ""
    data_link = f'data-link="{card["link"]}"' if card['link'] else ''
    has_children = card.get('children') and len(card['children']) > 0
    
    html = f'''
    <div class="card {card_class}" 
         data-id="{card['id']}" 
         data-type="{card['type']}"
         data-has-children="{str(has_children).lower()}"
         data-parent-id="{parent_id if parent_id else ''}"
         {data_link}>
        
        <div class="card-header">
            <div class="card-icon">
                {'<i class="fas fa-file"></i>' if card['type'] == 'file' else '<i class="fas fa-folder"></i>'}
            </div>
    '''
    
    if is_admin:
        html += f'''
            <div class="card-actions">
                <button class="card-menu-btn" onclick="event.stopPropagation(); showCardSettings({card['id']}, '{card['type']}', {parent_id if parent_id else 'null'})">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        '''
    
    html += '''
        </div>
        
        <div class="card-content">
    '''
    
    html += f'<h3>{card["name"]}</h3>'
    
    if card['subtitle']:
        html += f'<p>{card["subtitle"]}</p>'
    
    html += '</div>'
    html += '</div>'
    return html

@app.route('/')
def home():
    cards_data = load_cards()
    is_admin = session.get('is_admin', False)
    
    # Build search index
    build_search_index(cards_data)
    
    # Render all cards HTML with full functionality
    cards_html = ""
    for card in cards_data['cards']:
        cards_html += render_card_html(card, is_admin)
    
    return render_template('index.html', cards_html=cards_html, is_admin=is_admin)

@app.route('/card/<int:card_id>')
def view_card(card_id):
    """View card contents in new screen"""
    cards_data = load_cards()
    is_admin = session.get('is_admin', False)
    
    # Build search index
    build_search_index(cards_data)
    
    # Find the card
    card = find_card(cards_data['cards'], card_id)
    if not card:
        return "Card not found", 404
    
    # Render card contents with full functionality
    contents_html = ""
    if card.get('children'):
        for child in card['children']:
            contents_html += render_card_html(child, is_admin, card_id)
    
    return render_template('card_view.html', 
                         card=card, 
                         contents_html=contents_html, 
                         is_admin=is_admin)

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session['is_admin'] = True
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Invalid credentials'})

@app.route('/logout')
def logout():
    session.pop('is_admin', None)
    return redirect(url_for('home'))

@app.route('/api/cards', methods=['GET', 'POST', 'PUT', 'DELETE'])
def manage_cards():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'GET':
        cards_data = load_cards()
        return jsonify(cards_data)
    
    elif request.method == 'POST':
        data = request.get_json()
        cards_data = load_cards()
        
        # Generate new ID
        all_cards = flatten_cards(cards_data['cards'])
        max_id = max([card['id'] for card in all_cards]) if all_cards else 0
        new_id = max_id + 1
        
        new_card = {
            'id': new_id,
            'name': data.get('name', 'New Card'),
            'subtitle': data.get('subtitle', ''),
            'link': data.get('link', ''),
            'type': data.get('type', 'card'),
            'parent_id': data.get('parent_id'),
            'children': []
        }
        
        if data.get('parent_id'):
            # Add to parent card
            parent = find_card(cards_data['cards'], data['parent_id'])
            if parent:
                if 'children' not in parent:
                    parent['children'] = []
                parent['children'].append(new_card)
        else:
            # Add as main card
            cards_data['cards'].append(new_card)
        
        save_cards(cards_data)
        # Rebuild search index after adding new card
        build_search_index(cards_data)
        return jsonify({'success': True, 'card': new_card})
    
    elif request.method == 'PUT':
        data = request.get_json()
        cards_data = load_cards()
        
        card = find_card(cards_data['cards'], data['id'])
        if card:
            if 'name' in data:
                card['name'] = data['name']
            if 'subtitle' in data:
                card['subtitle'] = data['subtitle']
            if 'link' in data:
                card['link'] = data['link']
            save_cards(cards_data)
            # Rebuild search index after updating card
            build_search_index(cards_data)
            return jsonify({'success': True})
        
        return jsonify({'success': False, 'error': 'Card not found'})
    
    elif request.method == 'DELETE':
        card_id = request.args.get('id')
        cards_data = load_cards()
        
        if remove_card(cards_data['cards'], int(card_id)):
            save_cards(cards_data)
            # Rebuild search index after deleting card
            build_search_index(cards_data)
            return jsonify({'success': True})
        
        return jsonify({'success': False, 'error': 'Card not found'})

@app.route('/api/search')
def search():
    query = request.args.get('q', '').strip()
    print(f"Search query received: '{query}'")  # Debug line
    
    if not query or len(query) < 2:
        print("Query too short, returning empty results")  # Debug line
        return jsonify({'results': []})
    
    cards_data = load_cards()
    results = search_cards(query, cards_data)
    
    print(f"Found {len(results)} results")  # Debug line
    
    # Enhance results with link information
    enhanced_results = []
    for result in results:
        card = find_card(cards_data['cards'], result['id'])
        if card:
            enhanced_result = result.copy()
            enhanced_result['link'] = card.get('link', '')
            enhanced_results.append(enhanced_result)
    
    return jsonify({
        'query': query,
        'results': enhanced_results,
        'count': len(enhanced_results)
    })

def flatten_cards(cards):
    """Flatten all cards including children for ID generation"""
    all_cards = []
    for card in cards:
        all_cards.append(card)
        if card.get('children'):
            all_cards.extend(flatten_cards(card['children']))
    return all_cards

def find_card(cards, card_id):
    """Recursively find a card by ID"""
    for card in cards:
        if card['id'] == card_id:
            return card
        if card.get('children'):
            found = find_card(card['children'], card_id)
            if found:
                return found
    return None

def remove_card(cards, card_id):
    """Recursively remove a card by ID"""
    for i, card in enumerate(cards):
        if card['id'] == card_id:
            cards.pop(i)
            return True
        if card.get('children'):
            if remove_card(card['children'], card_id):
                return True
    return False

def load_videos():
    """Load videos data from JSON file"""
    try:
        with open(VIDEO_DATA_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"videos": []}

def save_videos(data):
    """Save videos data to JSON file"""
    os.makedirs(os.path.dirname(VIDEO_DATA_FILE), exist_ok=True)
    with open(VIDEO_DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

# Add video upload folder
VIDEO_UPLOAD_FOLDER = "static/uploads/videos"
app.config['VIDEO_UPLOAD_FOLDER'] = VIDEO_UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Allowed video extensions
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'}

def allowed_video_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

# Add new routes for videos
@app.route('/videos')
def videos():
    videos_data = load_videos()
    is_admin = session.get('is_admin', False)
    return render_template('videos.html', videos=videos_data['videos'], is_admin=is_admin)

@app.route('/api/videos', methods=['GET', 'POST', 'DELETE'])
def manage_videos():
    if request.method == 'GET':
        videos_data = load_videos()
        return jsonify(videos_data)
    
    elif request.method == 'POST':
        if not session.get('is_admin'):
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file'}), 400
        
        video_file = request.files['video']
        title = request.form.get('title', 'Untitled Video')
        description = request.form.get('description', '')
        
        if video_file.filename == '':
            return jsonify({'error': 'No video selected'}), 400
        
        if video_file and allowed_video_file(video_file.filename):
            # Generate unique filename
            file_extension = video_file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
            video_path = os.path.join(app.config['VIDEO_UPLOAD_FOLDER'], unique_filename)
            
            # Create upload directory if it doesn't exist
            os.makedirs(os.path.dirname(video_path), exist_ok=True)
            
            # Save video file
            video_file.save(video_path)
            
            # Create video data
            videos_data = load_videos()
            new_video = {
                'id': len(videos_data['videos']) + 1,
                'title': title,
                'description': description,
                'filename': unique_filename,
                'upload_date': datetime.now().isoformat(),
                'views': 0,
                'likes': 0,
                'dislikes': 0,
                'comments': []
            }
            
            videos_data['videos'].append(new_video)
            save_videos(videos_data)
            
            return jsonify({'success': True, 'video': new_video})
        else:
            return jsonify({'error': 'Invalid file type'}), 400
    
    elif request.method == 'DELETE':
        if not session.get('is_admin'):
            return jsonify({'error': 'Unauthorized'}), 401
        
        video_id = request.args.get('id')
        videos_data = load_videos()
        
        # Find and remove video
        video_index = None
        for i, video in enumerate(videos_data['videos']):
            if video['id'] == int(video_id):
                video_index = i
                # Remove video file
                video_path = os.path.join(app.config['VIDEO_UPLOAD_FOLDER'], video['filename'])
                if os.path.exists(video_path):
                    os.remove(video_path)
                break
        
        if video_index is not None:
            videos_data['videos'].pop(video_index)
            save_videos(videos_data)
            return jsonify({'success': True})
        
        return jsonify({'success': False, 'error': 'Video not found'})

@app.route('/api/videos/<int:video_id>/react', methods=['POST'])
def react_to_video(video_id):
    data = request.get_json()
    reaction = data.get('reaction')  # 'like' or 'dislike'
    
    videos_data = load_videos()
    for video in videos_data['videos']:
        if video['id'] == video_id:
            if reaction == 'like':
                video['likes'] += 1
            elif reaction == 'dislike':
                video['dislikes'] += 1
            save_videos(videos_data)
            return jsonify({'success': True, 'likes': video['likes'], 'dislikes': video['dislikes']})
    
    return jsonify({'success': False, 'error': 'Video not found'})

@app.route('/api/videos/<int:video_id>/comment', methods=['POST'])
def add_comment(video_id):
    data = request.get_json()
    comment_text = data.get('comment', '').strip()
    author = data.get('author', 'Anonymous')
    
    if not comment_text:
        return jsonify({'success': False, 'error': 'Comment cannot be empty'})
    
    videos_data = load_videos()
    for video in videos_data['videos']:
        if video['id'] == video_id:
            new_comment = {
                'id': len(video['comments']) + 1,
                'author': author,
                'text': comment_text,
                'timestamp': datetime.now().isoformat()
            }
            video['comments'].append(new_comment)
            save_videos(videos_data)
            return jsonify({'success': True, 'comment': new_comment})
    
    return jsonify({'success': False, 'error': 'Video not found'})

@app.route('/api/videos/<int:video_id>/view', methods=['POST'])
def increment_views(video_id):
    videos_data = load_videos()
    for video in videos_data['videos']:
        if video['id'] == video_id:
            video['views'] += 1
            save_videos(videos_data)
            return jsonify({'success': True, 'views': video['views']})
    
    return jsonify({'success': False, 'error': 'Video not found'})

if __name__ == '__main__':
    app.run(debug=True)