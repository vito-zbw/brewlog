import { db } from "@/lib/db";
import type { FollowCounts, LeaderboardEntry } from "@/types";
import { mapRows, firstRow } from "./util";

export async function follow(
  followerId: number,
  followingId: number
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO follows (follower_id, following_id) VALUES (?, ?)
          ON CONFLICT(follower_id, following_id) DO NOTHING`,
    args: [followerId, followingId],
  });
}

export async function unfollow(
  followerId: number,
  followingId: number
): Promise<void> {
  await db.execute({
    sql: "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
    args: [followerId, followingId],
  });
}

export async function isFollowing(
  followerId: number,
  followingId: number
): Promise<boolean> {
  const rs = await db.execute({
    sql: "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
    args: [followerId, followingId],
  });
  return rs.rows.length > 0;
}

export async function getFollowCounts(userId: number): Promise<FollowCounts> {
  const row = firstRow<FollowCounts>(
    await db.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS followers,
              (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following`,
      args: [userId, userId],
    })
  );
  return row ?? { followers: 0, following: 0 };
}

/** Users ranked by distinct bean origins tasted across their visits. */
export async function getOriginLeaderboard(
  limit = 10
): Promise<LeaderboardEntry[]> {
  const rs = await db.execute({
    sql: `SELECT u.id AS user_id, u.name AS user_name, u.image AS user_image,
                 COUNT(DISTINCT b.origin_country) AS value
          FROM users u
          JOIN visits v ON v.user_id = u.id
          JOIN visit_beans vb ON vb.visit_id = v.id
          JOIN beans b ON b.id = vb.bean_id
          GROUP BY u.id
          ORDER BY value DESC, u.name
          LIMIT ?`,
    args: [limit],
  });
  return mapRows<LeaderboardEntry>(rs);
}

/** Users ranked by distinct cafés visited. */
export async function getCafeLeaderboard(
  limit = 10
): Promise<LeaderboardEntry[]> {
  const rs = await db.execute({
    sql: `SELECT u.id AS user_id, u.name AS user_name, u.image AS user_image,
                 COUNT(DISTINCT v.cafe_id) AS value
          FROM users u
          JOIN visits v ON v.user_id = u.id
          GROUP BY u.id
          ORDER BY value DESC, u.name
          LIMIT ?`,
    args: [limit],
  });
  return mapRows<LeaderboardEntry>(rs);
}
