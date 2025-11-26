// Hardcoded session seed data
// Format: [movieIndex (0-based from SEED_MOVIES), watcherIndexes (array), watchedDate (YYYY-MM-DD), notes, ratings (object with watcher indexes as keys)]

export const SEED_SESSIONS = [
  // Watcher 0 sessions
  [0, [0], "2025-01-15", "Great movie night!", {0: 9}],
  [3, [0], "2025-02-20", "Loved it, will watch again", {0: 10}],
  [7, [0, 1], "2025-03-10", "Amazing cinematography", {0: 9, 1: 8}],
  [15, [0], "2025-04-05", "", {0: 7}],
  [22, [0, 2], "2025-05-12", "Watched with family, everyone enjoyed", {0: 8, 2: 9}],
  [8, [0], "2025-06-18", "Classic!", {0: 10}],
  [12, [0, 1, 3], "2025-07-22", "Edge of my seat the whole time", {0: 9, 1: 9, 3: 8}],
  
  // Watcher 1 sessions
  [2, [1], "2025-01-08", "Mind-blowing ending", {1: 9}],
  [4, [1], "2025-02-14", "Masterpiece!", {1: 10}],
  [10, [1, 2], "2025-03-25", "A bit slow but worth it", {1: 7, 2: 6}],
  [18, [1], "2025-04-30", "", {1: 8}],
  [25, [1, 0], "2025-06-05", "Perfect for a rainy day", {1: 8, 0: 8}],
  [30, [1], "2025-07-15", "Overrated in my opinion", {1: 6}],
  [14, [1, 4], "2025-08-20", "Beautiful soundtrack", {1: 9, 4: 9}],
  [6, [1], "2025-09-10", "Better than I remembered", {1: 9}],
  
  // Watcher 2 sessions
  [1, [2], "2025-01-22", "Fell asleep halfway through", {2: 5}],
  [5, [2, 3], "2025-03-15", "Made me cry", {2: 9, 3: 10}],
  [9, [2], "2025-04-18", "Could watch this every day", {2: 10}],
  [17, [2, 1], "2025-05-25", "Laughed so hard", {2: 9, 1: 8}],
  [21, [2], "2025-07-08", "", {2: 7}],
  [28, [2, 5], "2025-08-12", "Underrated gem", {2: 8, 5: 9}],
  
  // Watcher 3 sessions
  [11, [3], "2025-02-05", "Not what I expected, but good", {3: 7}],
  [13, [3, 4], "2025-03-20", "Had to pause several times, intense!", {3: 8, 4: 8}],
  [19, [3], "2025-05-15", "", {3: 6}],
  [24, [3, 0, 1], "2025-06-28", "Great movie night!", {3: 9, 0: 9, 1: 9}],
  [29, [3], "2025-08-05", "Amazing!", {3: 10}],
  [16, [3, 2], "2025-09-18", "Classic masterpiece", {3: 10, 2: 9}],
  [20, [3], "2025-10-22", "", {3: 8}],
  
  // Watcher 4 sessions
  [26, [4], "2025-01-30", "Loved every minute", {4: 9}],
  [27, [4, 5], "2025-04-12", "Beautiful visuals", {4: 9, 5: 8}],
  [31, [4], "2025-06-15", "", {4: 7}],
  [23, [4, 1], "2025-07-30", "Highly recommend", {4: 10, 1: 9}],
  [32, [4], "2025-09-05", "Perfect!", {4: 10}],
  
  // Watcher 5 sessions
  [33, [5], "2025-02-10", "Interesting plot", {5: 8}],
  [34, [5, 6], "2025-04-22", "Enjoyed it", {5: 8, 6: 7}],
  [35, [5], "2025-06-20", "", {5: 9}],
  [36, [5, 4], "2025-08-28", "Great storytelling", {5: 9, 4: 9}],
  [37, [5], "2025-10-15", "Fantastic!", {5: 10}],
  [38, [5, 2], "2025-11-05", "Must watch", {5: 9, 2: 8}],
  
  // Watcher 6 sessions
  [39, [6], "2025-03-08", "Solid movie", {6: 7}],
  [40, [6, 5], "2025-05-18", "Pretty good", {6: 8, 5: 8}],
  [41, [6], "2025-07-25", "", {6: 6}],
  [42, [6, 3], "2025-09-12", "Well made", {6: 8, 3: 9}],
  [43, [6], "2025-10-28", "Enjoyed it", {6: 8}],
];
