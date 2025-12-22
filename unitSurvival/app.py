from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os

# アプリケーション設定
app = Flask(__name__)
# データベースはローカルファイルとして保存されます
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- データベースモデル定義 ---

# 【追加】学期（期間）設定用モデル
class Term(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False)
    start_date = db.Column(db.String(20), nullable=False)
    end_date = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'start': self.start_date,
            'end': self.end_date
        }

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    professor = db.Column(db.String(100))
    room = db.Column(db.String(50))
    day = db.Column(db.String(50))
    absent_limit = db.Column(db.Integer, default=5)
    late_to_absent_ratio = db.Column(db.Integer, default=3)
    absent_count = db.Column(db.Integer, default=0)
    late_count = db.Column(db.Integer, default=0)
    memo = db.Column(db.Text)
    rating_fun = db.Column(db.Integer, default=3)
    rating_strictness = db.Column(db.Integer, default=3)
    
    # 【追加】開講学期ID（カンマ区切り文字列 "1,2" 等）
    term_ids = db.Column(db.String(50), default="1,2,3,4")

    def to_dict(self):
        """フロントエンド用辞書変換"""
        return {
            'id': self.id,
            'name': self.name,
            'professor': self.professor,
            'room': self.room,
            'day': self.day,
            'absentLimit': self.absent_limit,
            'lateToAbsentRatio': self.late_to_absent_ratio,
            'absentCount': self.absent_count,
            'lateCount': self.late_count,
            'memo': self.memo,
            'termIds': self.term_ids, # 【追加】
            'ratings': {
                'fun': self.rating_fun,
                'strictness': self.rating_strictness
            }
        }

# --- ルーティング ---

@app.route('/')
def index():
    """メインページ"""
    return render_template('index.html')

# 【追加】学期情報の取得
@app.route('/api/terms', methods=['GET'])
def get_terms():
    terms = Term.query.all()
    return jsonify([t.to_dict() for t in terms])

# 【追加】学期情報の更新（全削除して再登録）
@app.route('/api/terms', methods=['POST'])
def update_terms():
    data = request.json
    try:
        # 既存の設定をクリア
        db.session.query(Term).delete()
        
        # 新しい設定を保存
        for item in data:
            new_term = Term(
                id=item['id'],
                name=item['name'],
                start_date=item['start'],
                end_date=item['end']
            )
            db.session.add(new_term)
        
        db.session.commit()
        return jsonify({'message': 'Terms updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/courses', methods=['GET'])
def get_courses():
    """全授業取得"""
    courses = Course.query.all()
    return jsonify([c.to_dict() for c in courses])

@app.route('/api/courses', methods=['POST'])
def add_course():
    """新規授業追加"""
    data = request.json
    new_course = Course(
        name=data.get('name', '名称未設定'),
        professor=data.get('professor', ''),
        room=data.get('room', ''),
        day=data.get('day', ''),
        absent_limit=data.get('absentLimit', 5),
        late_to_absent_ratio=data.get('lateToAbsentRatio', 3),
        absent_count=0,
        late_count=0,
        memo=data.get('memo', ''),
        rating_fun=data.get('ratings', {}).get('fun', 3),
        rating_strictness=data.get('ratings', {}).get('strictness', 3),
        term_ids=data.get('termIds', "1,2,3,4") # 【追加】デフォルトは通年
    )
    db.session.add(new_course)
    db.session.commit()
    return jsonify(new_course.to_dict()), 201

@app.route('/api/courses/<int:course_id>', methods=['PUT'])
def update_course(course_id):
    """授業更新（カウントアップ等）"""
    course = Course.query.get_or_404(course_id)
    data = request.json
    
    if 'name' in data: course.name = data['name']
    if 'professor' in data: course.professor = data['professor']
    if 'room' in data: course.room = data['room']
    if 'day' in data: course.day = data['day']
    if 'absentLimit' in data: course.absent_limit = data['absentLimit']
    if 'lateToAbsentRatio' in data: course.late_to_absent_ratio = data['lateToAbsentRatio']
    if 'absentCount' in data: course.absent_count = data['absentCount']
    if 'lateCount' in data: course.late_count = data['lateCount']
    if 'memo' in data: course.memo = data['memo']
    if 'termIds' in data: course.term_ids = data['termIds'] # 【追加】
    if 'ratings' in data:
        if 'fun' in data['ratings']: course.rating_fun = data['ratings']['fun']
        if 'strictness' in data['ratings']: course.rating_strictness = data['ratings']['strictness']

    db.session.commit()
    return jsonify(course.to_dict())

@app.route('/api/reset', methods=['POST'])
def reset_data():
    """データ全消去（学期設定は残す仕様にしています）"""
    try:
        db.session.query(Course).delete()
        db.session.commit()
        return jsonify({'message': 'Reset successful'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # 初回起動時にテーブル作成
    app.run(debug=True, port=5000)