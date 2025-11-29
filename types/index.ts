export type Tournament = {
  id: string
  name: string
  code: string
  password: string
  adminPassword: string
  numberOfDays: number
  hasPlayAroundDay: boolean
  hasCalcutta: boolean
  hasPick3: boolean
  infiniteBetting: boolean
  allowSpectatorBetting: boolean
  allowSpectatorChat: boolean
  allowSpectatorFeed: boolean
  calcuttaCloseTime?: string
  scoringType: string
  creatorId: string
  createdAt: string
  updatedAt: string
  blurTop5?: boolean
}
