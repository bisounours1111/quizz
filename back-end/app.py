from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import random
import string
import logging
import time
import json

# Configuration des couleurs pour les logs
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# Configuration du logger avec des couleurs
class ColoredFormatter(logging.Formatter):
    def format(self, record):
        if 'ROOM' in record.msg:
            record.msg = f"{Colors.BLUE}{record.msg}{Colors.ENDC}"
        elif 'JOUEUR' in record.msg:
            record.msg = f"{Colors.GREEN}{record.msg}{Colors.ENDC}"
        elif 'ERREUR' in record.msg:
            record.msg = f"{Colors.RED}{record.msg}{Colors.ENDC}"
        elif 'DÉMARRAGE' in record.msg:
            record.msg = f"{Colors.YELLOW}{record.msg}{Colors.ENDC}"
        elif 'RÉPONSE' in record.msg:
            record.msg = f"{Colors.HEADER}{record.msg}{Colors.ENDC}"
        return super().format(record)

# Configuration du logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(ColoredFormatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Stockage des salles et des joueurs
rooms = {}
players = {}

# Structure pour stocker les réponses des joueurs
player_answers = {}

available_quizzes = json.load(open('questions.json', 'r', encoding='utf-8'))

@app.route('/api/quizzes', methods=['GET'])
def get_quizzes():
    return jsonify(available_quizzes)

@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room_info(room_id):
    if room_id not in rooms:
        return jsonify({'error': 'Room not found'}), 404
    
    room = rooms[room_id]
    return jsonify({
        'players': room['players'],
        'host': {
            'id': room['host_sid'],
            'name': room['host']
        },
        'settings': room['settings'],
        'selected_quiz': room['selected_quiz'],
        'status': room['status']
    })


def generate_room_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connecté: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"JOUEUR: Déconnexion du client: {request.sid}")
    
    # Vérifier si le joueur est dans une room
    if request.sid in players:
        player = players[request.sid]
        room_id = player['room']
        
        if room_id in rooms:
            # Si c'est l'hôte qui se déconnecte
            if request.sid == rooms[room_id]['host_sid']:
                logger.info(f"JOUEUR: L'hôte {player['name']} s'est déconnecté de la room {room_id}")
                # On ne supprime pas la room immédiatement, on attend un peu
                # pour permettre une reconnexion rapide
                emit('host_disconnected', room=room_id)
            else:
                # Si c'est un joueur normal
                logger.info(f"JOUEUR: Le joueur {player['name']} s'est déconnecté de la room {room_id}")
                # On ne retire pas immédiatement le joueur de la room
                emit('player_disconnected', {
                    'player_id': request.sid,
                    'player_name': player['name']
                }, room=room_id)
    
    # On ne supprime pas immédiatement les données du joueur
    # pour permettre une reconnexion rapide

@socketio.on('reconnect')
def handle_reconnect():
    logger.info(f"JOUEUR: Tentative de reconnexion du client: {request.sid}")
    
    # Si le joueur était dans une room avant la déconnexion
    if request.sid in players:
        player = players[request.sid]
        room_id = player['room']
        
        if room_id in rooms:
            # Rejoindre la room
            join_room(room_id)
            
            # Si c'était l'hôte
            if request.sid == rooms[room_id]['host_sid']:
                logger.info(f"JOUEUR: L'hôte {player['name']} s'est reconnecté à la room {room_id}")
                # Mettre à jour le sid de l'hôte
                rooms[room_id]['host_sid'] = request.sid
                emit('host_reconnected', room=room_id)
            else:
                logger.info(f"JOUEUR: Le joueur {player['name']} s'est reconnecté à la room {room_id}")
                # Mettre à jour le sid du joueur dans la liste des joueurs
                for p in rooms[room_id]['players']:
                    if p['name'] == player['name']:
                        p['sid'] = request.sid
                        break
                emit('player_reconnected', {
                    'player_id': request.sid,
                    'player_name': player['name']
                }, room=room_id)
            
            logger.info(f"JOUEUR: État de la room après reconnexion: {rooms[room_id]}")

@socketio.on('create_room')
def handle_create_room(data):
    logger.info(f"ROOM: Création de la room: {request.sid}")
    room_id = generate_room_id()
    player_name = data['player_name']
    
    rooms[room_id] = {
        'host': player_name,
        'host_sid': request.sid,
        'player_count': 0,
        'status': 'waiting',
        'players': [],
        'settings': {
            'responseTime': 15,
            'maxPlayers': 4
        },
        'selected_quiz': None
    }
    
    players[request.sid] = {
        'name': player_name,
        'room': room_id,
        'is_host': True
    }
    
    join_room(room_id)
    logger.info(f"ROOM: Room créée: {room_id}")
    logger.info(f"ROOM: État initial de la room: {rooms[room_id]}")
    
    response_data = {
        'room_id': room_id,
        'host': {
            'id': request.sid,
            'name': player_name
        }
    }
    logger.info(f"Envoi de room_created avec les données: {response_data}")
    
    emit('room_created', response_data, room=request.sid)
    emit('rooms_list', rooms, broadcast=True)

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data['room_id']
    player_name = data['player_name']
    
    logger.info(f"JOUEUR: Tentative de rejoindre la room {room_id} par {player_name} (sid: {request.sid})")
    
    if room_id not in rooms:
        logger.error(f"ERREUR: Room {room_id} non trouvée")
        emit('room_not_found', room=request.sid)
        return
    
    if rooms[room_id]['player_count'] >= rooms[room_id]['settings']['maxPlayers']:
        logger.error(f"ERREUR: Room {room_id} pleine")
        emit('room_full', room=request.sid)
        return
    
    if request.sid != rooms[room_id]['host_sid']:
        logger.info(f"JOUEUR: Ajout du joueur {player_name} à la room {room_id}")
        rooms[room_id]['players'].append({'sid': request.sid, 'name': player_name})
        rooms[room_id]['player_count'] = len(rooms[room_id]['players'])
        logger.info(f"JOUEUR: Joueur ajouté à la room {room_id}: {player_name} (sid: {request.sid})")
        logger.info(f"JOUEUR: Joueurs dans la room: {rooms[room_id]['players']}")
        logger.info(f"JOUEUR: Nombre de joueurs dans la room: {rooms[room_id]['player_count']}")
    else:
        logger.info(f"JOUEUR: Le joueur {player_name} est l'hôte de la room {room_id}")
    
    players[request.sid] = {
        'name': player_name,
        'room': room_id,
        'is_host': request.sid == rooms[room_id]['host_sid']
    }
    
    join_room(room_id)
    
    # Envoyer toutes les informations de la room
    room_data = {
        'players': rooms[room_id]['players'],
        'host': {
            'id': rooms[room_id]['host_sid'],
            'name': rooms[room_id]['host']
        },
        'settings': rooms[room_id]['settings'],
        'selected_quiz': rooms[room_id]['selected_quiz'],
        'is_owner': request.sid == rooms[room_id]['host_sid']
    }
    
    logger.info(f"État de la room après ajout du joueur: {rooms[room_id]}")
    logger.info(f"Envoi des données de la room: {room_data}")
    emit('player_joined_room', room_data, room=room_id)
    emit('rooms_list', rooms, broadcast=True)

@socketio.on('leave_room')
def handle_leave_room(room_id):
    if room_id in rooms:
        if request.sid == rooms[room_id]['host_sid']:
            # Si c'est l'hôte qui part volontairement, on supprime la salle
            logger.info(f"ROOM: L'hôte a quitté volontairement la room {room_id}, suppression de la room")
            del rooms[room_id]
            emit('room_deleted', room=room_id)
        else:
            # Si c'est un joueur qui part volontairement
            rooms[room_id]['players'] = [p for p in rooms[room_id]['players'] if p['sid'] != request.sid]
            rooms[room_id]['player_count'] = len(rooms[room_id]['players'])
            
            logger.info(f"JOUEUR: Le joueur {request.sid} a quitté volontairement la room {room_id}")
            logger.info(f"JOUEUR: Joueurs restants dans la room: {rooms[room_id]['players']}")

            leave_room(room_id)
            emit('player_left_room', {
                'players': rooms[room_id]['players'],
                'host': {
                    'id': rooms[room_id]['host_sid'],
                    'name': rooms[room_id]['host']
                }
            }, room=room_id)
        
        emit('rooms_list', rooms, broadcast=True)
        
        if request.sid in players:
            del players[request.sid]

@socketio.on('kick_player')
def handle_kick_player(data):
    room_id = data['room_id']
    player_id = data['player_id']
    
    if room_id in rooms and request.sid == rooms[room_id]['host_sid']:
        emit('kicked', room=player_id)
        # Forcer le joueur à quitter la salle
        if player_id in players:
            handle_leave_room(room_id)

@socketio.on('update_settings')
def handle_update_settings(data):
    room_id = data['room_id']
    settings = data['settings']
    
    if room_id in rooms and request.sid == rooms[room_id]['host_sid']:
        rooms[room_id]['settings'] = settings
        emit('settings_updated', settings, room=room_id)

@socketio.on('get_rooms')
def handle_get_rooms():
    emit('rooms_list', rooms, room=request.sid)

@socketio.on('select_quiz')
def handle_select_quiz(data):
    room_id = data['room_id']
    quiz_id = data['quiz_id']
    
    if room_id in rooms and request.sid == rooms[room_id]['host_sid']:
        selected_quiz = next((quiz for quiz in available_quizzes if quiz['id'] == quiz_id), None)
        if selected_quiz:
            rooms[room_id]['selected_quiz'] = selected_quiz
            emit('quiz_selected', {
                'quiz': selected_quiz,
                'room_id': room_id
            }, room=room_id)

@socketio.on('start_game')
def handle_start_game(data):
    room_id = data['room_id']
    
    logger.info(f"DÉMARRAGE: Démarrage de la partie dans la room {room_id}")
    logger.info(f"DÉMARRAGE: État de la room avant démarrage: {rooms[room_id]}")
    
    if room_id in rooms and request.sid == rooms[room_id]['host_sid']:
        if not rooms[room_id]['selected_quiz']:
            logger.error(f"ERREUR: Quiz non sélectionné")
            emit('error', {'message': 'Veuillez sélectionner un quiz avant de lancer la partie'}, room=request.sid)
            return
            
        if len(rooms[room_id]['players']) < 1:
            logger.error(f"ERREUR: Pas assez de joueurs")
            emit('error', {'message': 'Il faut au moins un joueur pour commencer'}, room=request.sid)
            return
        
        # Sauvegarder les informations actuelles des joueurs
        current_players = rooms[room_id]['players'].copy()
        current_player_count = len(current_players)
        
        # Mettre à jour la room avec les nouvelles informations tout en préservant les joueurs
        rooms[room_id].update({
            'status': 'playing',
            'current_question': 0,
            'start_time': time.time(),
            'players': current_players,
            'player_count': current_player_count
        })
        
        # Initialiser les réponses pour la nouvelle partie
        player_answers[room_id] = {}
        
        logger.info(f"DÉMARRAGE: État de la room après démarrage: {rooms[room_id]}")
        logger.info(f"DÉMARRAGE: Nombre de joueurs dans la room: {rooms[room_id]['player_count']}")
        logger.info(f"DÉMARRAGE: Liste des joueurs: {rooms[room_id]['players']}")
        
        # Envoyer les informations de démarrage à tous les joueurs
        emit('game_started', {
            'quiz': rooms[room_id]['selected_quiz'],
            'settings': rooms[room_id]['settings'],
            'players': current_players  # Inclure la liste des joueurs dans l'événement
        }, room=room_id)

@socketio.on('player_answer')
def handle_player_answer(data):
    room_id = data['room_id']
    answer = data['answer']
    
    if room_id not in rooms:
        return
    
    if request.sid == rooms[room_id]['host_sid']:
        return
    
    current_time = time.time()
    start_time = rooms[room_id].get('start_time', current_time)
    response_time = current_time - start_time
    
    if room_id not in player_answers:
        player_answers[room_id] = {}
    
    # Trouver le nom du joueur à partir de son sid
    player_name = None
    for p in rooms[room_id]['players']:
        if p['sid'] == request.sid:
            player_name = p['name']
            break
    
    if player_name:
        player_answers[room_id][request.sid] = {
            'answer': answer,
            'response_time': response_time,
            'player_name': player_name
        }
    

    all_players = [p['sid'] for p in rooms[room_id]['players']]
    
    logger.info(f"RÉPONSE: Player answers: {player_answers[room_id]}")
    logger.info(f"RÉPONSE: All players: {all_players}")
    

    if all(player_sid in player_answers[room_id] for player_sid in all_players) and len(all_players) > 0:
        logger.info(f"RÉPONSE: Tous les joueurs ont répondu, passage à la question suivante")
        
        if 'scoreboard' not in rooms[room_id]:
            rooms[room_id]['scoreboard'] = {}
        
        for player_sid, answer in player_answers[room_id].items():
            if player_sid not in rooms[room_id]['scoreboard']:
                rooms[room_id]['scoreboard'][player_sid] = 0 
            player_answer = answer['answer']
            correct_answer = rooms[room_id]['selected_quiz']['questions'][rooms[room_id]['current_question']]['options'][rooms[room_id]['selected_quiz']['questions'][rooms[room_id]['current_question']]['correctAnswer']]

            print(player_answer)
            print(correct_answer)
           
            if player_answer == correct_answer:
                rooms[room_id]['scoreboard'][player_sid] = (rooms[room_id]['scoreboard'][player_sid] or 0) + round(10 * (rooms[room_id]['settings']['responseTime'] - response_time))
            else:
                rooms[room_id]['scoreboard'][player_sid] = (rooms[room_id]['scoreboard'][player_sid] or 0)

        emit('all_players_answered', {
            'scoreboard': rooms[room_id]['scoreboard'],
            'correct_answer': correct_answer,
            'current_question': rooms[room_id]['selected_quiz']['questions'][rooms[room_id]['current_question']]
        }, room=room_id)
        
        # Réinitialiser les réponses pour la prochaine question
        player_answers[room_id] = {}
        
        # Passer à la question suivante
        rooms[room_id]['current_question'] += 1
        rooms[room_id]['start_time'] = time.time()
        
        # Vérifier si c'est la fin du quiz
        if rooms[room_id]['current_question'] >= len(rooms[room_id]['selected_quiz']['questions']):
            emit('quiz_finished', {
                'message': 'Quiz terminé'
            }, room=room_id)
            rooms[room_id]['status'] = 'finished'

@socketio.on('room_info_updated')
def handle_room_info_updated(data):
    room_id = data['room_id']
    if room_id in rooms:
        # Diffuser les informations mises à jour à tous les joueurs de la room
        emit('player_joined_room', {
            'players': data['players'],
            'host': data['host'],
            'settings': data['settings'],
            'selected_quiz': data['selected_quiz'],
            'is_owner': request.sid == rooms[room_id]['host_sid']
        }, room=room_id)

@socketio.on('start_next_question')
def handle_start_next_question(data):
    room_id = data['room_id']
    if room_id in rooms and request.sid == rooms[room_id]['host_sid']:
        emit('next_question', room=room_id)

@socketio.on('next_question')
def handle_next_question(data):
    room_id = data['room_id']
    
    if room_id in rooms and request.sid == rooms[room_id]['host_sid']:
        # Vérifier si c'est la fin du quiz
        if rooms[room_id]['current_question'] >= len(rooms[room_id]['selected_quiz']['questions']) - 1:
            emit('quiz_finished', {
                'message': 'Quiz terminé'
            }, room=room_id)
            rooms[room_id]['status'] = 'finished'
        else:
            # Passer à la question suivante
            rooms[room_id]['current_question'] += 1
            rooms[room_id]['start_time'] = time.time()
            
            # Envoyer la nouvelle question à tous les joueurs
            emit('next_question', {
                'question': rooms[room_id]['selected_quiz']['questions'][rooms[room_id]['current_question']]
            }, room=room_id)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=3001, debug=True)
