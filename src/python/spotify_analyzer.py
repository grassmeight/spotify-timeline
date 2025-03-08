import json
import sys
from datetime import datetime
import pandas as pd
from collections import defaultdict

def load_spotify_data(file_path):
    """
    Load Spotify streaming data from JSON file into a pandas DataFrame.
    """
    with open(file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    df = pd.DataFrame(data)
    
    # Convert timestamp to datetime
    df['ts'] = pd.to_datetime(df['ts'])
    
    return df

def get_comprehensive_stats(df):
    """
    Calculate comprehensive listening statistics.
    """
    # Basic stats
    total_ms = df['ms_played'].sum()
    total_hours = total_ms / (1000 * 60 * 60)
    total_minutes = total_ms / (1000 * 60)
    total_tracks = len(df)
    unique_artists = df['master_metadata_album_artist_name'].nunique()
    unique_albums = df['master_metadata_album_album_name'].nunique()
    unique_tracks = df['master_metadata_track_name'].nunique()
    
    # Time-based analysis
    df['hour'] = df['ts'].dt.hour
    df['day'] = df['ts'].dt.day_name()
    df['month'] = df['ts'].dt.month
    df['year'] = df['ts'].dt.year
    
    # Listening patterns
    hourly_distribution = df['hour'].value_counts().sort_index()
    daily_distribution = df['day'].value_counts()
    monthly_distribution = df['month'].value_counts().sort_index()
    
    # Calculate peak listening times
    peak_hour = hourly_distribution.idxmax()
    peak_day = daily_distribution.idxmax()
    
    # Behavior analysis
    skip_rate = (df['skipped'].sum() / len(df)) * 100
    offline_rate = (df['offline'].sum() / len(df)) * 100
    shuffle_rate = (df['shuffle'].sum() / len(df)) * 100
    
    # Platform analysis
    platform_distribution = df['platform'].value_counts()
    
    # Top content
    top_artists = df['master_metadata_album_artist_name'].value_counts().head(10)
    top_tracks = df['master_metadata_track_name'].value_counts().head(10)
    top_albums = df['master_metadata_album_album_name'].value_counts().head(10)
    
    # Average session length (considering tracks played within 30 minutes of each other as one session)
    df_sorted = df.sort_values('ts')
    df_sorted['time_diff'] = df_sorted['ts'].diff()
    session_threshold = pd.Timedelta(minutes=30)
    new_session = df_sorted['time_diff'] > session_threshold
    df_sorted['session_id'] = new_session.cumsum()
    sessions = df_sorted.groupby('session_id').agg({
        'ms_played': 'sum',
        'master_metadata_track_name': 'count'
    })
    avg_session_minutes = (sessions['ms_played'].mean() / (1000 * 60))
    avg_tracks_per_session = sessions['master_metadata_track_name'].mean()
    
    return {
        'total_stats': {
            'total_listening_hours': round(total_hours, 2),
            'total_listening_minutes': round(total_minutes, 2),
            'total_tracks_played': total_tracks,
            'unique_artists': unique_artists,
            'unique_albums': unique_albums,
            'unique_tracks': unique_tracks,
            'average_track_length_seconds': round(df['ms_played'].mean() / 1000, 2)
        },
        'listening_patterns': {
            'peak_hour': peak_hour,
            'peak_day': peak_day,
            'hourly_distribution': hourly_distribution.to_dict(),
            'daily_distribution': daily_distribution.to_dict(),
            'monthly_distribution': monthly_distribution.to_dict()
        },
        'behavior_stats': {
            'skip_rate': round(skip_rate, 2),
            'offline_rate': round(offline_rate, 2),
            'shuffle_rate': round(shuffle_rate, 2)
        },
        'session_stats': {
            'average_session_minutes': round(avg_session_minutes, 2),
            'average_tracks_per_session': round(avg_tracks_per_session, 2),
            'total_sessions': len(sessions)
        },
        'platform_stats': platform_distribution.to_dict(),
        'top_content': {
            'top_artists': top_artists.to_dict(),
            'top_tracks': top_tracks.to_dict(),
            'top_albums': top_albums.to_dict()
        }
    }

def analyze_listening_trends(df):
    """
    Analyze trends in listening behavior over time.
    """
    # Group by date and calculate daily stats
    daily_stats = df.groupby(df['ts'].dt.date).agg({
        'ms_played': 'sum',
        'master_metadata_track_name': 'count',
        'skipped': 'mean',
        'offline': 'mean',
        'shuffle': 'mean'
    })
    
    # Convert ms_played to hours
    daily_stats['hours_played'] = daily_stats['ms_played'] / (1000 * 60 * 60)
    
    # Calculate 7-day rolling averages
    rolling_stats = daily_stats.rolling(7).mean()
    
    # Convert to serializable format
    daily_stats_dict = {
        'dates': [str(date) for date in daily_stats.index],
        'hours_played': daily_stats['hours_played'].tolist(),
        'tracks_played': daily_stats['master_metadata_track_name'].tolist(),
        'skip_rate': daily_stats['skipped'].tolist(),
        'offline_rate': daily_stats['offline'].tolist(),
        'shuffle_rate': daily_stats['shuffle'].tolist()
    }
    
    rolling_stats_dict = {
        'dates': [str(date) for date in rolling_stats.index],
        'hours_played': rolling_stats['hours_played'].tolist(),
        'tracks_played': rolling_stats['master_metadata_track_name'].tolist(),
        'skip_rate': rolling_stats['skipped'].tolist(),
        'offline_rate': rolling_stats['offline'].tolist(),
        'shuffle_rate': rolling_stats['shuffle'].tolist()
    }
    
    return {
        'daily_stats': daily_stats_dict,
        'rolling_averages': rolling_stats_dict
    }

if __name__ == "__main__":
    # Get file path from command line argument
    file_path = sys.argv[1]
    
    # Load data
    df = load_spotify_data(file_path)
    
    # Calculate statistics
    stats = get_comprehensive_stats(df)
    trends = analyze_listening_trends(df)
    
    # Combine results
    results = {
        'stats': stats,
        'trends': trends
    }
    
    # Print as JSON for the electron app to parse
    print(json.dumps(results))