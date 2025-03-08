// Create a sample data structure based on the provided JSON format
const processRawData = () => {
  // This is a simplified version of what the Python script would do
  // In a real app, this would be done by the Python script
  
  const sampleData = {
    stats: {
      total_stats: {
        total_listening_hours: 1247.35,
        total_listening_minutes: 74841.2,
        total_tracks_played: 18542,
        unique_artists: 1243,
        unique_albums: 2156,
        unique_tracks: 7892,
        average_track_length_seconds: 242.5
      },
      listening_patterns: {
        peak_hour: 17,
        peak_day: "Friday",
        hourly_distribution: {
          "0": 342, "1": 156, "2": 78, "3": 45, "4": 23, "5": 67,
          "6": 234, "7": 567, "8": 876, "9": 1023, "10": 1156, "11": 1245,
          "12": 1345, "13": 1432, "14": 1567, "15": 1678, "16": 1789, "17": 1892,
          "18": 1756, "19": 1654, "20": 1432, "21": 1234, "22": 987, "23": 654
        },
        daily_distribution: {
          "Monday": 2345, "Tuesday": 2456, "Wednesday": 2567,
          "Thursday": 2678, "Friday": 3456, "Saturday": 2987, "Sunday": 2053
        },
        monthly_distribution: {
          "1": 1456, "2": 1345, "3": 1567, "4": 1678, "5": 1789, "6": 1890,
          "7": 1987, "8": 1876, "9": 1765, "10": 1654, "11": 1543, "12": 1432
        }
      },
      behavior_stats: {
        skip_rate: 23.45,
        offline_rate: 12.34,
        shuffle_rate: 67.89
      },
      session_stats: {
        average_session_minutes: 37.5,
        average_tracks_per_session: 9.3,
        total_sessions: 1987
      },
      platform_stats: {
        "Android Phone": 7654,
        "Windows Desktop": 5432,
        "Web Player": 2345,
        "iOS Phone": 1987,
        "Smart Speaker": 876,
        "Smart TV": 248
      },
      top_content: {
        top_artists: {
          "Noa Kirel": 876,
          "The Weeknd": 765,
          "Drake": 654,
          "Billie Eilish": 543,
          "Dua Lipa": 432,
          "Post Malone": 321,
          "Ariana Grande": 298,
          "Bad Bunny": 276,
          "Kendrick Lamar": 254,
          "Harry Styles": 243
        },
        top_tracks: {
          "יש בי אהבה": 123,
          "As It Was": 112,
          "Heat Waves": 98,
          "Stay": 87,
          "Good 4 U": 76,
          "Levitating": 65,
          "Save Your Tears": 54,
          "Bad Habits": 43,
          "Easy On Me": 32,
          "Shivers": 21
        },
        top_albums: {
          "כפולה": 234,
          "Future Nostalgia": 212,
          "SOUR": 198,
          "Harry's House": 187,
          "Planet Her": 176,
          "Midnights": 165,
          "Un Verano Sin Ti": 154,
          "30": 143,
          "Justice": 132,
          "Happier Than Ever": 121
        }
      }
    },
    trends: {
      daily_stats: {
        dates: Array.from({ length: 30 }, (_, i) => {
          const date = new Date(2024, 0, i + 1);
          return date.toISOString().split('T')[0];
        }),
        hours_played: Array.from({ length: 30 }, () => Number((Math.random() * 3 + 2).toFixed(1))),
        tracks_played: Array.from({ length: 30 }, () => Math.floor(Math.random() * 30 + 35)),
        skip_rate: Array.from({ length: 30 }, () => Number((Math.random() * 5 + 21).toFixed(1))),
        offline_rate: Array.from({ length: 30 }, () => Number((Math.random() * 5 + 10).toFixed(1))),
        shuffle_rate: Array.from({ length: 30 }, () => Number((Math.random() * 5 + 65).toFixed(1)))
      },
      rolling_averages: {
        dates: Array.from({ length: 30 }, (_, i) => {
          const date = new Date(2024, 0, i + 1);
          return date.toISOString().split('T')[0];
        }),
        hours_played: Array.from({ length: 30 }, (_, i) => Number((i < 7 ? (2.3 + i * 0.2) : 3.5).toFixed(1))),
        tracks_played: Array.from({ length: 30 }, (_, i) => (i < 7 ? (34 + i * 2) : 52)),
        skip_rate: Array.from({ length: 30 }, (_, i) => Number((i < 7 ? (21.3 + i * 0.4) : 24.1).toFixed(1))),
        offline_rate: Array.from({ length: 30 }, (_, i) => Number((i < 7 ? (10.2 + i * 0.5) : 13.3).toFixed(1))),
        shuffle_rate: Array.from({ length: 30 }, (_, i) => Number((i < 7 ? (65.4 + i * 0.5) : 68.7).toFixed(1)))
      }
    }
  };
  
  return sampleData;
};

const SampleData = processRawData();

export default SampleData;