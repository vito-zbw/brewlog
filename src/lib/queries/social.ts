import { db } from "@/lib/db";
import type { FollowCounts, FollowUser, LeaderboardEntry } from "@/types";
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

interface RawFollowUser {
  id: number;
  name: string;
  image: string | null;
  is_mutual: number; // SQLite EXISTS → 0 | 1
}

function toFollowUser(r: RawFollowUser): FollowUser {
  return {
    id: r.id,
    name: r.name,
    image: r.image,
    isMutual: Number(r.is_mutual) === 1,
  };
}

/** People `userId` follows, newest first. `isMutual` = they follow back. */
export async function getFollowing(userId: number): Promise<FollowUser[]> {
  const rs = await db.execute({
    sql: `SELECT u.id, u.name, u.image,
                 EXISTS(
                   SELECT 1 FROM follows r
                   WHERE r.follower_id = u.id AND r.following_id = ?
                 ) AS is_mutual
          FROM follows f
          JOIN users u ON u.id = f.following_id
          WHERE f.follower_id = ?
          ORDER BY f.created_at DESC`,
    args: [userId, userId],
  });
  return mapRows<RawFollowUser>(rs).map(toFollowUser);
}

/** People who follow `userId`, newest first. `isMutual` = userId follows back. */
export async function getFollowers(userId: number): Promise<FollowUser[]> {
  const rs = await db.execute({
    sql: `SELECT u.id, u.name, u.image,
                 EXISTS(
                   SELECT 1 FROM follows r
                   WHERE r.follower_id = ? AND r.following_id = u.id
                 ) AS is_mutual
          FROM follows f
          JOIN users u ON u.id = f.follower_id
          WHERE f.following_id = ?
          ORDER BY f.created_at DESC`,
    args: [userId, userId],
  });
  return mapRows<RawFollowUser>(rs).map(toFollowUser);
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
