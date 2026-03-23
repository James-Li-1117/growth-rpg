import { useEffect, useMemo, useState } from 'react'

const XP_PER_LEVEL = 100
const MAX_DAILY_TASKS_SOFT = 6
const FOCUS_SECONDS_DEFAULT = 25 * 60

const quotes = [
  '今天不是拼命的一天，而是稳定推进的一天。',
  '每一次完成小任务，都是在给未来的自己加点。',
  '成长不是爆发，而是持续积累经验值。',
  '你不是在硬撑，你是在升级。',
  '慢慢变强，比偶尔燃烧更厉害。',
]

function defaultTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: '学习 25 分钟',
      category: '学习',
      xp: 20,
      completed: false,
    },
    {
      id: crypto.randomUUID(),
      title: '阅读 10 页',
      category: '阅读',
      xp: 15,
      completed: false,
    },
    {
      id: crypto.randomUUID(),
      title: '运动 20 分钟',
      category: '运动',
      xp: 25,
      completed: false,
    },
    {
      id: crypto.randomUUID(),
      title: '尝试一个新技能 10 分钟',
      category: '新技能',
      xp: 30,
      completed: false,
    },
  ]
}

function getTodayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getYesterdayString() {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function getTitleByLevel(level) {
  if (level >= 15) return '自律宗师'
  if (level >= 10) return '高阶成长者'
  if (level >= 6) return '稳步升级者'
  if (level >= 3) return '成长执行者'
  return '人类知识探索者'
}

function createInitialGameData() {
  return {
    level: 1,
    xp: 0,
    streak: 1,
    lastLoginDate: getTodayString(),
    tasks: defaultTasks(),
    completedToday: 0,
    totalCompleted: 0,
    playerTitle: '人类知识探索者',
    logs: ['欢迎来到你的成长游戏。'],
    focusSecondsLeft: FOCUS_SECONDS_DEFAULT,
    focusRunning: false,
    focusSessionsCompleted: 0,
  }
}

function normalizeDailyData(data) {
  const today = getTodayString()
  const yesterday = getYesterdayString()

  if (data.lastLoginDate === today) {
    return data
  }

  let newStreak = 1
  if (data.lastLoginDate === yesterday) {
    newStreak = data.streak + 1
  }

  return {
    ...data,
    streak: newStreak,
    lastLoginDate: today,
    completedToday: 0,
    tasks: defaultTasks(),
    focusSecondsLeft: FOCUS_SECONDS_DEFAULT,
    focusRunning: false,
    logs: [
      `新的冒险日开始了。连续 ${newStreak} 天保持成长。`,
      ...(data.logs || []).slice(0, 7),
    ],
  }
}

function getBadges(data) {
  const badges = []

  if (data.totalCompleted >= 1) {
    badges.push({
      id: 'first-task',
      name: '初次通关',
      icon: '🌱',
      desc: '完成第一个任务',
      unlocked: true,
    })
  } else {
    badges.push({
      id: 'first-task',
      name: '初次通关',
      icon: '🌱',
      desc: '完成第一个任务',
      unlocked: false,
    })
  }

  if (data.streak >= 3) {
    badges.push({
      id: 'streak-3',
      name: '稳定开局',
      icon: '🔥',
      desc: '连续成长 3 天',
      unlocked: true,
    })
  } else {
    badges.push({
      id: 'streak-3',
      name: '稳定开局',
      icon: '🔥',
      desc: '连续成长 3 天',
      unlocked: false,
    })
  }

  if (data.streak >= 7) {
    badges.push({
      id: 'streak-7',
      name: '一周勇者',
      icon: '🏅',
      desc: '连续成长 7 天',
      unlocked: true,
    })
  } else {
    badges.push({
      id: 'streak-7',
      name: '一周勇者',
      icon: '🏅',
      desc: '连续成长 7 天',
      unlocked: false,
    })
  }

  if (data.level >= 5) {
    badges.push({
      id: 'level-5',
      name: '成长加速器',
      icon: '⚡',
      desc: '达到 Lv.5',
      unlocked: true,
    })
  } else {
    badges.push({
      id: 'level-5',
      name: '成长加速器',
      icon: '⚡',
      desc: '达到 Lv.5',
      unlocked: false,
    })
  }

  if (data.focusSessionsCompleted >= 1) {
    badges.push({
      id: 'focus-1',
      name: '专注启动',
      icon: '⏳',
      desc: '完成 1 次专注计时',
      unlocked: true,
    })
  } else {
    badges.push({
      id: 'focus-1',
      name: '专注启动',
      icon: '⏳',
      desc: '完成 1 次专注计时',
      unlocked: false,
    })
  }

  if (data.focusSessionsCompleted >= 5) {
    badges.push({
      id: 'focus-5',
      name: '深度专注者',
      icon: '🧠',
      desc: '完成 5 次专注计时',
      unlocked: true,
    })
  } else {
    badges.push({
      id: 'focus-5',
      name: '深度专注者',
      icon: '🧠',
      desc: '完成 5 次专注计时',
      unlocked: false,
    })
  }

  return badges
}

function App() {
  const [gameData, setGameData] = useState(() => {
  const saved = localStorage.getItem('growth-game-save-v2')

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return normalizeDailyData(parsed)
    } catch (e) {
      console.error('读取存档失败:', e)
    }
  }

  return createInitialGameData()
  })

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('学习')
  const [newTaskXp, setNewTaskXp] = useState(20)

  useEffect(() => {
    localStorage.setItem('growth-game-save-v2', JSON.stringify(gameData))
  }, [gameData])

  useEffect(() => {
    if (!gameData.focusRunning) return

    const timer = setInterval(() => {
      setGameData((prev) => {
        if (!prev.focusRunning) return prev

        if (prev.focusSecondsLeft <= 1) {
          let newXp = prev.xp + 25
          let newLevel = prev.level
          let leveledUp = false

          while (newXp >= XP_PER_LEVEL) {
            newXp -= XP_PER_LEVEL
            newLevel += 1
            leveledUp = true
          }

          return {
            ...prev,
            xp: newXp,
            level: newLevel,
            playerTitle: getTitleByLevel(newLevel),
            focusRunning: false,
            focusSecondsLeft: FOCUS_SECONDS_DEFAULT,
            focusSessionsCompleted: prev.focusSessionsCompleted + 1,
            logs: [
              leveledUp
                ? `完成一次专注计时，获得 25 XP，并升到 Lv.${newLevel}！`
                : '完成一次专注计时，获得 25 XP。',
              ...prev.logs.slice(0, 7),
            ],
          }
        }

        return {
          ...prev,
          focusSecondsLeft: prev.focusSecondsLeft - 1,
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameData.focusRunning])

  const progressPercent = Math.min((gameData.xp / XP_PER_LEVEL) * 100, 100)

  const completedCount = useMemo(
    () => gameData.tasks.filter((task) => task.completed).length,
    [gameData.tasks]
  )

  const totalTaskXp = useMemo(
    () => gameData.tasks.reduce((sum, task) => sum + task.xp, 0),
    [gameData.tasks]
  )

  const completedTaskXp = useMemo(
    () =>
      gameData.tasks
        .filter((task) => task.completed)
        .reduce((sum, task) => sum + task.xp, 0),
    [gameData.tasks]
  )

  const quote = quotes[gameData.level % quotes.length]
  const badges = getBadges(gameData)
  const unlockedBadges = badges.filter((b) => b.unlocked).length
  const overloadMode = gameData.tasks.length > MAX_DAILY_TASKS_SOFT

  function gainXp(amount, sourceText = '完成任务') {
    setGameData((prev) => {
      let newXp = prev.xp + amount
      let newLevel = prev.level
      let leveledUp = false

      while (newXp >= XP_PER_LEVEL) {
        newXp -= XP_PER_LEVEL
        newLevel += 1
        leveledUp = true
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        playerTitle: getTitleByLevel(newLevel),
        logs: [
          leveledUp
            ? `${sourceText}，获得 ${amount} XP，并升到 Lv.${newLevel}！`
            : `${sourceText}，获得 ${amount} XP。`,
          ...prev.logs.slice(0, 7),
        ],
      }
    })
  }

  function completeTask(taskId) {
    const task = gameData.tasks.find((t) => t.id === taskId)
    if (!task || task.completed) return

    setGameData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: true } : t
      ),
      completedToday: prev.completedToday + 1,
      totalCompleted: prev.totalCompleted + 1,
    }))

    gainXp(task.xp, `完成任务：${task.title}`)
  }

  function addTask() {
    const title = newTaskTitle.trim()
    if (!title) return

    if (gameData.tasks.length >= 8) {
      setGameData((prev) => ({
        ...prev,
        logs: [
          '今日任务已接近上限。先完成一些，再决定是否继续增加。',
          ...prev.logs.slice(0, 7),
        ],
      }))
      return
    }

    const safeXp = Number(newTaskXp)
    const finalXp = Number.isNaN(safeXp) ? 20 : Math.max(5, Math.min(100, safeXp))

    const newTask = {
      id: crypto.randomUUID(),
      title,
      category: newTaskCategory,
      xp: finalXp,
      completed: false,
    }

    setGameData((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      logs: [`新增任务：${title}`, ...prev.logs.slice(0, 7)],
    }))

    setNewTaskTitle('')
    setNewTaskCategory('学习')
    setNewTaskXp(20)
  }

  function deleteTask(taskId) {
    setGameData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
      logs: ['移除了一个任务，减轻今天负担。', ...prev.logs.slice(0, 7)],
    }))
  }

  function resetToday() {
    setGameData((prev) => ({
      ...prev,
      tasks: defaultTasks(),
      completedToday: 0,
      focusSecondsLeft: FOCUS_SECONDS_DEFAULT,
      focusRunning: false,
      logs: ['你已手动重置今日任务。', ...prev.logs.slice(0, 7)],
    }))
  }

  function bonusReward() {
    gainXp(10, '主动鼓励自己')
  }

  function toggleFocus() {
    setGameData((prev) => ({
      ...prev,
      focusRunning: !prev.focusRunning,
      logs: [
        prev.focusRunning ? '暂停专注计时。' : '开始一次专注计时。',
        ...prev.logs.slice(0, 7),
      ],
    }))
  }

  function resetFocus() {
    setGameData((prev) => ({
      ...prev,
      focusRunning: false,
      focusSecondsLeft: FOCUS_SECONDS_DEFAULT,
      logs: ['专注计时已重置。', ...prev.logs.slice(0, 7)],
    }))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #061127 0%, #0b1732 45%, #132347 100%)',
        color: '#f8fbff',
        padding: '32px 20px',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '20px',
          }}
        >
          <div style={panelStyle}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#d2dcf4',
                    marginBottom: '8px',
                    letterSpacing: '1px',
                    fontWeight: 700,
                  }}
                >
                  PERSONAL GROWTH RPG
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '44px',
                    lineHeight: 1.1,
                    color: '#ffffff',
                  }}
                >
                  🎮 My Growth Game
                </h1>
                <div
                  style={{
                    marginTop: '10px',
                    color: '#8fd3ff',
                    fontSize: '22px',
                    fontWeight: 800,
                  }}
                >
                  {gameData.playerTitle}
                </div>
              </div>

              <div style={{ minWidth: '180px', textAlign: 'right' }}>
                <div style={{ fontSize: '16px', color: '#d8e4ff', fontWeight: 700 }}>
                  连续成长
                </div>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff' }}>
                  🔥 {gameData.streak} 天
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '28px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '14px',
              }}
            >
              <StatCard label="等级" value={`Lv.${gameData.level}`} />
              <StatCard label="今日完成" value={`${gameData.completedToday}`} />
              <StatCard label="累计完成" value={`${gameData.totalCompleted}`} />
            </div>

            <div style={{ marginTop: '26px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  color: '#eef5ff',
                  fontSize: '16px',
                  fontWeight: 700,
                }}
              >
                <span>经验值</span>
                <span>
                  {gameData.xp} / {XP_PER_LEVEL}
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '20px',
                  background: 'rgba(255,255,255,0.14)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background:
                      'linear-gradient(90deg, #45e08a 0%, #52c7ff 50%, #9c7bff 100%)',
                    transition: 'width 0.35s ease',
                    boxShadow: '0 0 20px rgba(82,199,255,0.35)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '22px',
                background: 'rgba(82,199,255,0.12)',
                border: '1px solid rgba(82,199,255,0.28)',
                borderRadius: '18px',
                padding: '16px 18px',
                color: '#f4fbff',
                fontSize: '18px',
                lineHeight: 1.6,
                fontWeight: 600,
              }}
            >
              ✨ {quote}
            </div>

            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <button onClick={bonusReward} style={primaryButtonStyle}>
                +10 XP 鼓励一下自己
              </button>
              <button onClick={resetToday} style={secondaryButtonStyle}>
                重置今日任务
              </button>
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={sectionTitle}>🧱 添加自定义任务</h2>

            <div style={{ display: 'grid', gap: '12px' }}>
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="例如：背 20 个单词 / 跑步 3km / 练琴 15 分钟"
                style={inputStyle}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px',
                  gap: '12px',
                }}
              >
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  style={inputStyle}
                >
                  <option>学习</option>
                  <option>阅读</option>
                  <option>运动</option>
                  <option>新技能</option>
                </select>

                <input
                  type="number"
                  value={newTaskXp}
                  onChange={(e) => setNewTaskXp(e.target.value)}
                  min="5"
                  max="100"
                  style={inputStyle}
                />
              </div>

              <button onClick={addTask} style={primaryButtonStyle}>
                添加任务
              </button>
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: overloadMode
                  ? 'rgba(255, 170, 70, 0.14)'
                  : 'rgba(255,255,255,0.06)',
                border: overloadMode
                  ? '1px solid rgba(255, 170, 70, 0.35)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: overloadMode ? '#ffe6c2' : '#d6e5ff',
                fontSize: '15px',
                lineHeight: 1.6,
                fontWeight: 600,
              }}
            >
              {overloadMode
                ? '反内耗提示：你今天的任务有点多了。先把最重要的 3~5 个做掉，剩下的不急。'
                : '反内耗模式：保持任务适量，小步推进，比堆满任务更容易持续。'}
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                borderRadius: '18px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  color: '#d6e4fb',
                  marginBottom: '8px',
                  fontWeight: 700,
                }}
              >
                今日任务经验进度
              </div>
              <div style={{ fontSize: '30px', fontWeight: 900, color: '#ffffff' }}>
                {completedTaskXp} / {totalTaskXp} XP
              </div>
              <div style={{ marginTop: '8px', color: '#d7e5fb', fontWeight: 600 }}>
                已完成 {completedCount} / {gameData.tasks.length} 个任务
              </div>
            </div>

            <div style={{ marginTop: '22px' }}>
              <h3 style={subTitle}>📜 最近动态</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {gameData.logs.map((log, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#f4f8ff',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: '0.95fr 1.05fr',
            gap: '20px',
          }}
        >
          <div style={panelStyle}>
            <h2 style={sectionTitle}>⏳ 专注计时器</h2>

            <div
              style={{
                fontSize: '52px',
                fontWeight: 900,
                color: '#ffffff',
                textAlign: 'center',
                margin: '10px 0 18px 0',
                letterSpacing: '2px',
              }}
            >
              {formatTime(gameData.focusSecondsLeft)}
            </div>

            <div
              style={{
                textAlign: 'center',
                color: '#dce9ff',
                fontSize: '16px',
                lineHeight: 1.7,
                fontWeight: 600,
                marginBottom: '18px',
              }}
            >
              完成一次 25 分钟专注，可获得 <span style={{ color: '#8fd3ff' }}>25 XP</span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button onClick={toggleFocus} style={primaryButtonStyle}>
                {gameData.focusRunning ? '暂停专注' : '开始专注'}
              </button>
              <button onClick={resetFocus} style={secondaryButtonStyle}>
                重置计时
              </button>
            </div>

            <div
              style={{
                marginTop: '18px',
                textAlign: 'center',
                color: '#d6e5ff',
                fontSize: '15px',
                fontWeight: 700,
              }}
            >
              已完成专注次数：{gameData.focusSessionsCompleted}
            </div>
          </div>

          <div style={panelStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: '14px',
              }}
            >
              <h2 style={{ ...sectionTitle, marginBottom: 0 }}>🏆 成就徽章</h2>
              <div
                style={{
                  color: '#dce9ff',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                已解锁 {unlockedBadges} / {badges.length}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  style={{
                    borderRadius: '18px',
                    padding: '16px',
                    background: badge.unlocked
                      ? 'linear-gradient(135deg, rgba(82,199,255,0.16), rgba(156,123,255,0.18))'
                      : 'rgba(255,255,255,0.05)',
                    border: badge.unlocked
                      ? '1px solid rgba(82,199,255,0.32)'
                      : '1px solid rgba(255,255,255,0.08)',
                    opacity: badge.unlocked ? 1 : 0.62,
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{badge.icon}</div>
                  <div
                    style={{
                      color: '#ffffff',
                      fontSize: '16px',
                      fontWeight: 800,
                      marginBottom: '6px',
                    }}
                  >
                    {badge.name}
                  </div>
                  <div
                    style={{
                      color: '#d8e6ff',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      fontWeight: 600,
                    }}
                  >
                    {badge.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...panelStyle, marginTop: '22px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '30px', color: '#ffffff' }}>
              🗺️ 今日任务面板
            </h2>
            <div
              style={{
                color: '#d9e7ff',
                fontWeight: 700,
                fontSize: '16px',
              }}
            >
              小步推进，不追求极限，追求稳定通关
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {gameData.tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  borderRadius: '20px',
                  padding: '18px',
                  background: task.completed
                    ? 'linear-gradient(135deg, rgba(69,224,138,0.22), rgba(82,199,255,0.16))'
                    : 'rgba(255,255,255,0.06)',
                  border: task.completed
                    ? '1px solid rgba(69,224,138,0.35)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: task.completed
                    ? '0 0 24px rgba(69,224,138,0.12)'
                    : 'none',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    marginBottom: '12px',
                    padding: '6px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: 'rgba(148,163,184,0.18)',
                    color: '#e5eeff',
                  }}
                >
                  {task.category}
                </div>

                <h3
                  style={{
                    margin: '0 0 10px 0',
                    fontSize: '22px',
                    lineHeight: 1.3,
                    color: '#ffffff',
                  }}
                >
                  {task.title}
                </h3>

                <div
                  style={{
                    marginBottom: '16px',
                    color: '#9ad8ff',
                    fontWeight: 800,
                    fontSize: '16px',
                  }}
                >
                  +{task.xp} XP
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <button
                    onClick={() => completeTask(task.id)}
                    disabled={task.completed}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: 'none',
                      borderRadius: '14px',
                      cursor: task.completed ? 'not-allowed' : 'pointer',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: task.completed ? '#eafff2' : '#0c1830',
                      background: task.completed
                        ? 'rgba(69,224,138,0.36)'
                        : 'linear-gradient(135deg, #f8fbff, #d7e6ff)',
                      opacity: task.completed ? 0.9 : 1,
                    }}
                  >
                    {task.completed ? '✅ 已完成' : '完成任务'}
                  </button>

                  {!task.completed && (
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#d8e6ff',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      删除任务
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        padding: '18px',
      }}
    >
      <div
        style={{
          color: '#d9e6ff',
          fontSize: '15px',
          marginBottom: '8px',
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '30px',
          fontWeight: 900,
          color: '#ffffff',
        }}
      >
        {value}
      </div>
    </div>
  )
}

const panelStyle = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '24px',
  padding: '24px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
  backdropFilter: 'blur(10px)',
}

const sectionTitle = {
  marginTop: 0,
  marginBottom: '18px',
  fontSize: '28px',
  color: '#ffffff',
}

const subTitle = {
  marginTop: 0,
  marginBottom: '12px',
  color: '#ffffff',
  fontSize: '22px',
}

const primaryButtonStyle = {
  background: 'linear-gradient(135deg, #46c5ff, #8b63ff)',
  color: 'white',
  border: 'none',
  borderRadius: '14px',
  padding: '12px 18px',
  fontSize: '15px',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(70,197,255,0.22)',
}

const secondaryButtonStyle = {
  background: 'rgba(255,255,255,0.08)',
  color: '#f8fbff',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '14px',
  padding: '12px 18px',
  fontSize: '15px',
  fontWeight: 800,
  cursor: 'pointer',
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
  fontWeight: 600,
}

export default App