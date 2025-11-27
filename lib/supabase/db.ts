import { createClient, createServiceRoleClient } from "@/lib/supabase/client"
import type {
  Tournament,
  Player,
  Course,
  Group,
  Round,
  Competition,
  CompetitionEntry,
  Prediction,
  Auction,
  PlayerCredit,
  Message,
  Post,
  Championship,
  Notification,
} from "@/lib/types"

// Helper to get Supabase client
const getClient = async () => await createClient()

const generateId = () => crypto.randomUUID()

const transformTournament = (dbTournament: any): Tournament => ({
  id: dbTournament.id,
  name: dbTournament.name,
  code: dbTournament.code,
  password: dbTournament.password,
  adminPassword: dbTournament.admin_password,
  scoringType: dbTournament.scoring_type,
  numberOfDays: dbTournament.number_of_days,
  hasPlayAroundDay: dbTournament.has_play_around_day,
  hasCalcutta: dbTournament.has_calcutta,
  hasPick3: dbTournament.has_pick3,
  calcuttaCloseTime: dbTournament.calcutta_close_time,
  allowSpectatorChat: dbTournament.allow_spectator_chat ?? true,
  allowSpectatorFeed: dbTournament.allow_spectator_feed ?? true,
  allowSpectatorBetting: dbTournament.allow_spectator_betting ?? true,
  infiniteBetting: dbTournament.infinite_betting ?? false,
  createdAt: dbTournament.created_at,
  updatedAt: dbTournament.updated_at,
})

const transformPlayer = (dbPlayer: any): Player => ({
  id: dbPlayer.id,
  name: dbPlayer.name,
  handicap: dbPlayer.handicap,
  password: dbPlayer.password,
  tournamentId: dbPlayer.tournament_id,
  teePreference: dbPlayer.tee_preference,
  profilePicture: dbPlayer.profile_picture,
  isSpectator: dbPlayer.is_spectator || false,
  isAdmin: dbPlayer.is_admin || false,
})

const transformCourse = (dbCourse: any): Course => {
  return {
    id: dbCourse.id,
    name: dbCourse.name,
    holes: Array.isArray(dbCourse.holes)
      ? dbCourse.holes.map((hole: any, index: number) => ({
          holeNumber: index + 1, // Generate 1-based hole number from array index
          par: hole.par,
          strokeIndex: hole.strokeIndex || hole.stroke_index,
        }))
      : [],
    tournamentId: dbCourse.tournament_id,
  }
}

const transformGroup = (dbGroup: any): Group => ({
  id: dbGroup.id,
  name: dbGroup.name,
  playerIds: dbGroup.player_ids,
  courseId: dbGroup.course_id,
  date: dbGroup.date,
  day: dbGroup.day,
  teeTime: dbGroup.tee_time,
  startingHole: dbGroup.starting_hole,
  tournamentId: dbGroup.tournament_id,
})

const transformRound = (dbRound: any): Round => {
  // Convert database scores (jsonb) to TypeScript HoleScore array
  const holes = Array.isArray(dbRound.scores)
    ? dbRound.scores.map((score: any) => ({
        holeNumber: score.holeNumber || score.hole_number,
        strokes: score.strokes,
        points: score.points,
        penalty: score.penalty,
      }))
    : []

  // Calculate totals from holes
  const totalGross = holes.reduce((sum: number, hole: any) => sum + (hole.strokes || 0), 0)
  const totalPoints = holes.reduce((sum: number, hole: any) => sum + (hole.points || 0), 0)

  return {
    id: dbRound.id,
    groupId: dbRound.group_id,
    playerId: dbRound.player_id,
    holes,
    totalGross,
    totalPoints,
    completed: holes.length > 0 && holes.every((h: any) => h.strokes > 0),
    submitted: dbRound.submitted || false,
    handicapUsed: dbRound.handicap_used || 0,
  }
}

const transformCompetition = (dbComp: any): Competition => ({
  id: dbComp.id,
  type: dbComp.type,
  holeNumber: dbComp.hole_number,
  enabled: dbComp.enabled ?? true,
  day: dbComp.day,
  courseId: dbComp.course_id,
  tournamentId: dbComp.tournament_id,
})

const transformCompetitionEntry = (dbEntry: any): CompetitionEntry => ({
  id: dbEntry.id,
  competitionId: dbEntry.competition_id,
  playerId: dbEntry.player_id,
  groupId: dbEntry.group_id || "",
  distance: dbEntry.distance,
  timestamp: dbEntry.timestamp || dbEntry.created_at,
})

const transformAuction = (dbAuction: any): Auction => ({
  id: dbAuction.id,
  playerId: dbAuction.auctioned_player_id,
  bidderId: dbAuction.buyer_player_id,
  amount: dbAuction.amount,
  timestamp: dbAuction.created_at,
  tournamentId: dbAuction.tournament_id,
})

const transformPrediction = (dbPrediction: any): Prediction => ({
  id: dbPrediction.id,
  playerId: dbPrediction.player_id,
  predictedWinnerId: dbPrediction.predicted_player_ids?.[0] || "",
  predictedTop3Ids: dbPrediction.predicted_player_ids || [],
  timestamp: dbPrediction.created_at,
  tournamentId: dbPrediction.tournament_id,
})

const transformPlayerCredit = (dbCredit: any): PlayerCredit => ({
  id: dbCredit.id,
  playerId: dbCredit.player_id,
  credits: dbCredit.credits,
  tournamentId: dbCredit.tournament_id,
})

const transformChampionship = (dbChamp: any): Championship => ({
  id: dbChamp.id,
  year: dbChamp.year,
  winnerId: dbChamp.player_id,
  winnerName: "", // TODO: join with player name
  winnerPhoto: "", // TODO: join with player photo
  notes: dbChamp.notes,
  tournamentId: dbChamp.tournament_id,
})

const transformNotification = (dbNotif: any): Notification => ({
  id: dbNotif.id,
  type: dbNotif.type,
  title: dbNotif.title,
  message: dbNotif.message,
  timestamp: dbNotif.timestamp,
  read: dbNotif.read,
  playerId: dbNotif.player_id,
  tournamentId: dbNotif.tournament_id,
})

const transformMessage = (dbMessage: any): Message => ({
  id: dbMessage.id,
  userId: dbMessage.player_id,
  userName: dbMessage.player_name,
  content: dbMessage.message,
  timestamp: dbMessage.timestamp,
  tournamentId: dbMessage.tournament_id,
})

const transformPost = (dbPost: any): Post => ({
  id: dbPost.id,
  userId: dbPost.player_id,
  userName: dbPost.player_name,
  caption: dbPost.content,
  mediaUrl: dbPost.media_url,
  mediaType: dbPost.media_type,
  timestamp: dbPost.timestamp,
  tournamentId: dbPost.tournament_id,
  likedBy: dbPost.liked_by || [],
  comments: [],
})

// ============================================================================
// TOURNAMENTS
// ============================================================================

export async function createTournament(tournament: Omit<Tournament, "id" | "createdAt" | "updatedAt">) {
  const supabase = await createServiceRoleClient()

  const insertData: any = {
    id: generateId(),
    name: tournament.name,
    code: tournament.code,
    password: tournament.password,
    admin_password: tournament.adminPassword,
    scoring_type: tournament.scoringType,
    number_of_days: tournament.numberOfDays,
    has_play_around_day: tournament.hasPlayAroundDay,
    has_calcutta: tournament.hasCalcutta,
    has_pick3: tournament.hasPick3,
    calcutta_close_time: tournament.calcuttaCloseTime,
  }

  // Only add spectator fields if they're explicitly provided
  // (columns may not exist yet)
  if (tournament.allowSpectatorChat !== undefined) {
    insertData.allow_spectator_chat = tournament.allowSpectatorChat
  }
  if (tournament.allowSpectatorFeed !== undefined) {
    insertData.allow_spectator_feed = tournament.allowSpectatorFeed
  }
  if (tournament.allowSpectatorBetting !== undefined) {
    insertData.allow_spectator_betting = tournament.allowSpectatorBetting
  }
  if (tournament.infiniteBetting !== undefined) {
    insertData.infinite_betting = tournament.infiniteBetting
  }

  const { data, error } = await supabase.from("tournaments").insert(insertData).select().single()

  if (error) throw error
  return transformTournament(data)
}

export async function getTournamentByCode(code: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("tournaments").select("*").eq("code", code).single()

  if (error) return null
  return transformTournament(data)
}

export async function getTournamentById(id: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single()

  if (error) return null
  return transformTournament(data)
}

export async function updateTournament(id: string, updates: Partial<Tournament>) {
  const supabase = await getClient()
  const updateData: any = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.password !== undefined) updateData.password = updates.password
  if (updates.adminPassword !== undefined) updateData.admin_password = updates.adminPassword
  if (updates.scoringType !== undefined) updateData.scoring_type = updates.scoringType
  if (updates.numberOfDays !== undefined) updateData.number_of_days = updates.numberOfDays
  if (updates.hasPlayAroundDay !== undefined) updateData.has_play_around_day = updates.hasPlayAroundDay
  if (updates.hasCalcutta !== undefined) updateData.has_calcutta = updates.hasCalcutta
  if (updates.hasPick3 !== undefined) updateData.has_pick3 = updates.hasPick3
  if (updates.calcuttaCloseTime !== undefined) updateData.calcutta_close_time = updates.calcuttaCloseTime
  if (updates.allowSpectatorChat !== undefined) updateData.allow_spectator_chat = updates.allowSpectatorChat
  if (updates.allowSpectatorFeed !== undefined) updateData.allow_spectator_feed = updates.allowSpectatorFeed
  if (updates.allowSpectatorBetting !== undefined) updateData.allow_spectator_betting = updates.allowSpectatorBetting
  if (updates.infiniteBetting !== undefined) updateData.infinite_betting = updates.infiniteBetting

  if (Object.keys(updateData).length === 0) {
    console.log("[v0] No fields to update, returning existing tournament")
    // No fields to update, just return the existing tournament
    return getTournamentById(id)
  }

  const { data, error } = await supabase.from("tournaments").update(updateData).eq("id", id).select().single()

  if (error) throw error
  return transformTournament(data)
}

export async function getAllTournaments() {
  const supabase = await getClient()
  const { data, error } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false })

  if (error) return []
  return data.map(transformTournament)
}

// ============================================================================
// PLAYERS
// ============================================================================

export async function createPlayer(player: Omit<Player, "id" | "createdAt" | "updatedAt">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("players")
    .insert({
      id: generateId(),
      name: player.name,
      handicap: player.handicap,
      password: player.password,
      tournament_id: player.tournamentId,
      tee_preference: player.teePreference || null,
      profile_picture: player.profilePicture,
      is_spectator: player.isSpectator || false,
      is_admin: player.isAdmin || false,
    })
    .select()
    .single()

  if (error) throw error
  return transformPlayer(data)
}

export async function getPlayersByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("players").select("*").eq("tournament_id", tournamentId).order("name")

  if (error) return []
  return data.map(transformPlayer)
}

export async function getPlayerById(id: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("players").select("*").eq("id", id).single()

  if (error) return null
  return transformPlayer(data)
}

export async function updatePlayer(id: string, updates: Partial<Player>) {
  const supabase = await getClient()
  const updateData: any = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.handicap !== undefined) updateData.handicap = updates.handicap
  if (updates.password !== undefined) updateData.password = updates.password
  if (updates.teePreference !== undefined) updateData.tee_preference = updates.teePreference
  if (updates.profilePicture !== undefined) updateData.profile_picture = updates.profilePicture
  if (updates.isSpectator !== undefined) updateData.is_spectator = updates.isSpectator
  if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin

  const { data, error } = await supabase.from("players").update(updateData).eq("id", id).select().single()

  if (error) throw error
  return transformPlayer(data)
}

export async function deletePlayer(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("players").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// COURSES
// ============================================================================

export async function createCourse(course: Omit<Course, "id" | "createdAt">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("courses")
    .insert({
      id: generateId(),
      name: course.name,
      holes: course.holes,
      tournament_id: course.tournamentId,
    })
    .select()
    .single()

  if (error) throw error
  return transformCourse(data)
}

export async function getCoursesByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("courses").select("*").eq("tournament_id", tournamentId).order("name")

  if (error) return []
  return data.map(transformCourse)
}

export async function getCourseById(id: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).single()

  if (error) return null
  return transformCourse(data)
}

export async function updateCourse(id: string, updates: Partial<Course>) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("courses")
    .update({
      name: updates.name,
      holes: updates.holes,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return transformCourse(data)
}

export async function deleteCourse(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("courses").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// GROUPS
// ============================================================================

export async function createGroup(group: Omit<Group, "id" | "createdAt">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("groups")
    .insert({
      id: generateId(),
      name: group.name,
      day: group.day,
      course_id: group.courseId,
      player_ids: group.playerIds,
      date: group.date,
      tee_time: group.teeTime,
      starting_hole: group.startingHole || null,
      tournament_id: group.tournamentId,
    })
    .select()
    .single()

  if (error) throw error
  return transformGroup(data)
}

export async function getGroupsByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("day")
    .order("tee_time")

  if (error) return []
  return data.map(transformGroup)
}

export async function getGroupById(id: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("groups").select("*").eq("id", id).single()

  if (error) return null
  return transformGroup(data)
}

export async function updateGroup(id: string, updates: Partial<Group>) {
  const supabase = await getClient()
  const updateData: any = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.day !== undefined) updateData.day = updates.day
  if (updates.courseId !== undefined) updateData.course_id = updates.courseId
  if (updates.playerIds !== undefined) updateData.player_ids = updates.playerIds
  if (updates.date !== undefined) updateData.date = updates.date
  if (updates.teeTime !== undefined) updateData.tee_time = updates.teeTime
  if (updates.startingHole !== undefined) updateData.starting_hole = updates.startingHole

  const { data, error } = await supabase.from("groups").update(updateData).eq("id", id).select().single()

  if (error) throw error
  return transformGroup(data)
}

export async function deleteGroup(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("groups").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// ROUNDS
// ============================================================================

export async function createRound(round: Omit<Round, "id" | "createdAt" | "updatedAt">) {
  const supabase = await getClient()

  // Convert HoleScore array to database format
  const scoresJson = round.holes.map((hole) => ({
    holeNumber: hole.holeNumber,
    strokes: hole.strokes,
    points: hole.points,
    penalty: hole.penalty,
  }))

  const { data, error } = await supabase
    .from("rounds")
    .insert({
      id: generateId(),
      player_id: round.playerId,
      group_id: round.groupId,
      day: round.day,
      scores: scoresJson,
      handicap_used: round.handicapUsed,
      submitted: round.submitted || false,
    })
    .select()
    .single()

  if (error) throw error
  return transformRound(data)
}

export async function getRoundsByPlayer(playerId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("rounds").select("*").eq("player_id", playerId).order("day")

  if (error) return []
  return data.map(transformRound)
}

export async function getRoundByPlayerAndDay(playerId: string, day: number) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("rounds").select("*").eq("player_id", playerId).eq("day", day).single()

  if (error) return null
  return transformRound(data)
}

export async function getRoundsByGroup(groupId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("rounds").select("*").eq("group_id", groupId).order("day")

  if (error) return []
  return data.map(transformRound)
}

export async function getRoundsByTournament(tournamentId: string) {
  const supabase = await getClient()

  // Get all groups for this tournament first
  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id")
    .eq("tournament_id", tournamentId)

  if (groupsError || !groups || groups.length === 0) return []

  const groupIds = groups.map((g) => g.id)

  // Get all rounds for these groups
  const { data, error } = await supabase.from("rounds").select("*").in("group_id", groupIds).order("day")

  if (error) return []
  return data.map(transformRound)
}

export async function updateRound(id: string, updates: Partial<Round>) {
  const supabase = await getClient()
  const updateData: any = {}

  if (updates.holes !== undefined) {
    // Convert HoleScore array to database format
    updateData.scores = updates.holes.map((hole) => ({
      holeNumber: hole.holeNumber,
      strokes: hole.strokes,
      points: hole.points,
      penalty: hole.penalty,
    }))
  }
  if (updates.handicapUsed !== undefined) updateData.handicap_used = updates.handicapUsed
  if (updates.submitted !== undefined) updateData.submitted = updates.submitted

  const { data, error } = await supabase.from("rounds").update(updateData).eq("id", id).select().single()

  if (error) throw error
  return transformRound(data)
}

export async function deleteRound(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("rounds").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// COMPETITIONS
// ============================================================================

export async function createCompetition(competition: Omit<Competition, "id" | "createdAt">) {
  const supabase = await getClient()

  console.log("[v0] Creating competition:", {
    type: competition.type,
    holeNumber: competition.holeNumber,
    day: competition.day,
    courseId: competition.courseId,
  })

  const { data, error } = await supabase
    .from("competitions")
    .insert({
      id: generateId(),
      type: competition.type,
      day: competition.day,
      course_id: competition.courseId,
      hole_number: competition.holeNumber,
      tournament_id: competition.tournamentId,
    })
    .select()
    .single()

  if (error) throw error

  console.log("[v0] Competition saved to database:", {
    id: data.id,
    type: data.type,
    day: data.day,
    holeNumber: data.hole_number,
  })

  return transformCompetition(data)
}

export async function getCompetitionsByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("competitions").select("*").eq("tournament_id", tournamentId).order("day")

  if (error) return []
  return data.map(transformCompetition)
}

export async function updateCompetition(id: string, updates: Partial<Competition>) {
  const supabase = await getClient()
  const updateData: any = {}
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.day !== undefined) updateData.day = updates.day
  if (updates.courseId !== undefined) updateData.course_id = updates.courseId
  if (updates.holeNumber !== undefined) updateData.hole_number = updates.holeNumber

  const { data, error } = await supabase.from("competitions").update(updateData).eq("id", id).select().single()

  if (error) throw error
  return transformCompetition(data)
}

export async function deleteCompetition(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("competitions").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// COMPETITION ENTRIES
// ============================================================================

export async function createCompetitionEntry(entry: Omit<CompetitionEntry, "id" | "createdAt">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("competition_entries")
    .insert({
      id: generateId(),
      competition_id: entry.competitionId,
      player_id: entry.playerId,
      group_id: entry.groupId || null,
      distance: entry.distance,
      timestamp: entry.timestamp || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return transformCompetitionEntry(data)
}

export async function getEntriesByCompetition(competitionId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("competition_entries")
    .select("*")
    .eq("competition_id", competitionId)
    .order("distance", { ascending: false })

  if (error) return []
  return data.map(transformCompetitionEntry)
}

export async function updateCompetitionEntry(id: string, distance: number) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("competition_entries").update({ distance }).eq("id", id).select().single()

  if (error) throw error
  return transformCompetitionEntry(data)
}

export async function deleteCompetitionEntry(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("competition_entries").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// MESSAGES (Chat)
// ============================================================================

export async function createMessage(message: Omit<Message, "id" | "timestamp">) {
  const supabase = await getClient()

  console.log("[v0] createMessage called with:", {
    tournamentId: message.tournamentId,
    userId: message.userId,
    userName: message.userName,
    content: message.content,
  })

  const { data, error } = await supabase
    .from("messages")
    .insert({
      id: generateId(),
      tournament_id: message.tournamentId,
      player_id: message.userId,
      player_name: message.userName,
      message: message.content,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error inserting message:", error)
    throw error
  }
  return data
}

export async function getMessagesByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("timestamp", { ascending: true })

  if (error) return []
  return data.map(transformMessage)
}

// ============================================================================
// POSTS (Social Feed)
// ============================================================================

export async function createPost(post: Omit<Post, "id" | "timestamp">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("posts")
    .insert({
      id: generateId(),
      tournament_id: post.tournamentId,
      player_id: post.userId, // Can be null for system posts
      player_name: post.userName,
      content: post.caption,
      media_url: post.mediaUrl,
      media_type: post.mediaType,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPostsByTournament(tournamentId: string) {
  const supabase = await getClient()
  console.log("[v0] Fetching posts from database for tournament:", tournamentId)
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("timestamp", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching posts:", error)
    return []
  }

  console.log("[v0] Raw posts from database:", data?.length || 0)

  if (data) {
    return data.map(transformPost)
  }
  return []
}

export async function deletePost(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("posts").delete().eq("id", id)

  if (error) throw error
}

export async function togglePostLike(postId: string, playerId: string) {
  const supabase = await getClient()

  // Get current liked_by array
  const { data: post, error: fetchError } = await supabase.from("posts").select("liked_by").eq("id", postId).single()

  if (fetchError) throw fetchError

  const likedBy = post.liked_by || []
  const isLiked = likedBy.includes(playerId)

  // Toggle like
  const updatedLikedBy = isLiked ? likedBy.filter((id: string) => id !== playerId) : [...likedBy, playerId]

  const { data, error } = await supabase
    .from("posts")
    .update({ liked_by: updatedLikedBy })
    .eq("id", postId)
    .select()
    .single()

  if (error) throw error
  return transformPost(data)
}

export async function createComment(comment: {
  postId: string
  playerId: string
  playerName: string
  content: string
}) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("comments")
    .insert({
      id: generateId(),
      post_id: comment.postId,
      player_id: comment.playerId,
      player_name: comment.playerName,
      content: comment.content,
    })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    userName: data.player_name,
    content: data.content,
    timestamp: data.timestamp,
  }
}

export async function getCommentsByPost(postId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("timestamp", { ascending: true })

  if (error) return []
  return data.map((comment: any) => ({
    id: comment.id,
    userName: comment.player_name,
    content: comment.content,
    timestamp: comment.timestamp,
  }))
}

// ============================================================================
// AUCTIONS
// ============================================================================

export async function createAuction(auction: Omit<Auction, "id" | "createdAt">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("auctions")
    .insert({
      id: generateId(),
      tournament_id: auction.tournamentId,
      auctioned_player_id: auction.playerId,
      buyer_player_id: auction.bidderId,
      amount: auction.amount,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAuctionsByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("auctions").select("*").eq("tournament_id", tournamentId)

  if (error) return []
  return data.map(transformAuction)
}

export async function updateAuction(id: string, updates: Partial<Auction>) {
  const supabase = await getClient()
  const updateData: any = {}
  if (updates.bidderId !== undefined) updateData.buyer_player_id = updates.bidderId
  if (updates.amount !== undefined) updateData.amount = updates.amount

  const { data, error } = await supabase.from("auctions").update(updateData).eq("id", id).select().single()

  if (error) throw error
  return transformAuction(data)
}

export async function deleteAuction(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("auctions").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// PREDICTIONS (Pick 3)
// ============================================================================

export async function createPrediction(prediction: Omit<Prediction, "id" | "createdAt">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("predictions")
    .insert({
      id: generateId(),
      tournament_id: prediction.tournamentId,
      player_id: prediction.playerId,
      predicted_player_ids: prediction.predictedTop3Ids,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPredictionsByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("predictions").select("*").eq("tournament_id", tournamentId)

  if (error) return []
  return data.map(transformPrediction)
}

export async function updatePrediction(id: string, predictedPlayerIds: string[]) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("predictions")
    .update({ predicted_player_ids: predictedPlayerIds })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return transformPrediction(data)
}

export async function deletePrediction(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("predictions").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// PLAYER CREDITS
// ============================================================================

export async function createPlayerCredit(credit: Omit<PlayerCredit, "id" | "createdAt" | "updatedAt">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("player_credits")
    .insert({
      id: generateId(),
      tournament_id: credit.tournamentId,
      player_id: credit.playerId,
      credits: credit.credits,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getCreditsByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase.from("player_credits").select("*").eq("tournament_id", tournamentId)

  if (error) return []
  return data.map(transformPlayerCredit)
}

export async function getCreditByPlayer(playerId: string, tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("player_credits")
    .select("*")
    .eq("player_id", playerId)
    .eq("tournament_id", tournamentId)
    .single()

  if (error) return null
  return transformPlayerCredit(data)
}

export async function updatePlayerCredit(id: string, updates: Partial<PlayerCredit>) {
  const supabase = await getClient()
  const updateData: any = {}
  if (updates.credits !== undefined) updateData.credits = updates.credits

  const { data, error } = await supabase.from("player_credits").update(updateData).eq("id", id).select().single()

  if (error) throw error
  return transformPlayerCredit(data)
}

export async function deletePlayerCredit(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("player_credits").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// CHAMPIONSHIPS
// ============================================================================

export async function createChampionship(championship: Omit<Championship, "id" | "createdAt">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("championships")
    .insert({
      id: generateId(),
      tournament_id: championship.tournamentId,
      player_id: championship.winnerId,
      year: championship.year,
      notes: championship.notes,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getChampionshipsByTournament(tournamentId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("championships")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("year", { ascending: false })

  if (error) return []
  return data.map(transformChampionship)
}

export async function deleteChampionship(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("championships").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function createNotification(notification: Omit<Notification, "id" | "timestamp">) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      id: generateId(),
      tournament_id: notification.tournamentId,
      player_id: notification.playerId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getNotificationsByPlayer(playerId: string) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("player_id", playerId)
    .order("timestamp", { ascending: false })

  if (error) return []
  return data.map(transformNotification)
}

export async function markNotificationAsRead(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id)

  if (error) throw error
}

export async function deleteNotification(id: string) {
  const supabase = await getClient()
  const { error } = await supabase.from("notifications").delete().eq("id", id)

  if (error) throw error
}
