import { useEffect, useMemo, useRef, useState } from 'react'

const XP_PER_LEVEL = 100
const MAX_DAILY_TASKS_SOFT = 6
const MAX_DAILY_TASKS_HARD = 8
const FOCUS_SECONDS_DEFAULT = 25 * 60

const CATEGORY_OPTIONS = ['学习', '阅读', '运动', '新技能']

const quotes = [
  '今天不是拼命的一天，而是稳定推进的一天。',
  '每一次完成小任务，都是在给未来的自己加点。',
  '成长不是爆发，而是持续积累经验值。',
  '你不是在硬撑，你是在升级。',
  '慢慢变强，比偶尔燃烧更厉害。',
]

function createTask(title, category, xp) {
  return {
    id: crypto.randomUUID(),
    title,
    category,
    xp,
    completed: false,
    createdAt: Date.now(),
  }
}

function defaultTasks() {
  return [
    createTask('学习 25 分钟', '学习', 20),
    createTask('阅读 10 页', '阅读', 15),
    createTask('运动 20 分钟', '运动', 25),
    createTask('尝试一个新技能 10 分钟', '新技能', 30),
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

function formatMinutes(totalSeconds) {
  return Math.floor(totalSeconds / 60)
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
    focusTotalSeconds: 0,
    completedTaskHistory: [],
  }
}

function normalizeDailyData(data) {
  const today = getTodayString()
  const yesterday = getYesterdayString()

  if (data.lastLoginDate === today) return data

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
  return [
    {
      id: 'first-task',
      name: '初次通关',
      icon: '🌱',
      desc: '完成第一个任务',
      unlocked: data.totalCompleted >= 1,
    },
    {
      id: 'task-10',
      name: '稳定执行',
      icon: '📘',
      desc: '累计完成 10 个任务',
      unlocked: data.totalCompleted >= 10,
    },
    {
      id: 'streak-3',
      name: '稳定开局',
      icon: '🔥',
      desc: '连续成长 3 天',
      unlocked: data.streak >= 3,
    },
    {
      id: 'streak-7',
      name: '一周勇者',
      icon: '🏅',
      desc: '连续成长 7 天',
      unlocked: data.streak >= 7,
    },
    {
      id: 'level-5',
      name: '成长加速器',
      icon: '⚡',
      desc: '达到 Lv.5',
      unlocked: data.level >= 5,
    },
    {
      id: 'focus-1',
      name: '专注启动',
      icon: '⏳',
      desc: '完成 1 次专注计时',
      unlocked: data.focusSessionsCompleted >= 1,
    },
    {
      id: 'focus-5',
      name: '深度专注者',
      icon: '🧠',
      desc: '完成 5 次专注计时',
      unlocked: data.focusSessionsCompleted >= 5,
    },
  ]
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return startOfDay(d)
}

function App() {
  const [gameData, setGameData] = useState(() => {
    const saved = localStorage.getItem('growth-game-save-v4')
    if (saved) {
      try {
        return normalizeDailyData(JSON.parse(saved))
      } catch (e) {
        console.error('读取存档失败:', e)
      }
    }
    return createInitialGameData()
  })

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('学习')
  const [newTaskXp, setNewTaskXp] = useState(20)

  const [activeView, setActiveView] = useState('overview')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('学习')
  const [editXp, setEditXp] = useState(20)

  const [screenWidth, setScreenWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  const [badgeModal, setBadgeModal] = useState(null)
  const previousUnlockedIdsRef = useRef([])

  useEffect(() => {
    localStorage.setItem('growth-game-save-v4', JSON.stringify(gameData))
  }, [gameData])

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
            focusTotalSeconds: prev.focusTotalSeconds + FOCUS_SECONDS_DEFAULT,
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

  const badges = useMemo(() => getBadges(gameData), [gameData])

  useEffect(() => {
    const unlockedIds = badges.filter((b) => b.unlocked).map((b) => b.id)
    const prevUnlockedIds = previousUnlockedIdsRef.current

    const newUnlockedBadge = badges.find(
      (badge) => badge.unlocked && !prevUnlockedIds.includes(badge.id)
    )

    if (prevUnlockedIds.length > 0 && newUnlockedBadge) {
      setBadgeModal(newUnlockedBadge)
    }

    previousUnlockedIdsRef.current = unlockedIds
  }, [badges])

  const isMobile = screenWidth < 768
  const isTablet = screenWidth >= 768 && screenWidth < 1100

  const progressPercent = Math.min((gameData.xp / XP_PER_LEVEL) * 100, 100)
  const quote = quotes[gameData.level % quotes.length]
  const unlockedBadges = badges.filter((b) => b.unlocked).length
  const overloadMode = gameData.tasks.length > MAX_DAILY_TASKS_SOFT

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

  const weekStart = daysAgo(6)
  const weeklyHistory = useMemo(
    () =>
      (gameData.completedTaskHistory || []).filter(
        (item) => startOfDay(item.completedAt) >= weekStart
      ),
    [gameData.completedTaskHistory, weekStart]
  )

  const weeklyCompletedCount = weeklyHistory.length

  const categoryStats = useMemo(() => {
    const counts = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c, 0]))
    weeklyHistory.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1
    })

    const total = weeklyHistory.length || 1
    return CATEGORY_OPTIONS.map((category) => ({
      category,
      count: counts[category] || 0,
      percent: Math.round(((counts[category] || 0) / total) * 100),
    }))
  }, [weeklyHistory])

  const last7DaysStats = useMemo(() => {
    const arr = []
    for (let i = 6; i >= 0; i -= 1) {
      const day = daysAgo(i)
      const label = `${day.getMonth() + 1}/${day.getDate()}`
      const count = (gameData.completedTaskHistory || []).filter(
        (item) => startOfDay(item.completedAt).getTime() === day.getTime()
      ).length
      arr.push({ label, count })
    }
    return arr
  }, [gameData.completedTaskHistory])

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
      completedTaskHistory: [
        {
          id: crypto.randomUUID(),
          taskId,
          title: task.title,
          category: task.category,
          xp: task.xp,
          completedAt: Date.now(),
        },
        ...(prev.completedTaskHistory || []),
      ],
    }))

    gainXp(task.xp, `完成任务：${task.title}`)
  }

  function addTask() {
    const title = newTaskTitle.trim()
    if (!title) return

    if (gameData.tasks.length >= MAX_DAILY_TASKS_HARD) {
      setGameData((prev) => ({
        ...prev,
        logs: [
          '今日任务已经很多了。先做最重要的，再决定是否继续增加。',
          ...prev.logs.slice(0, 7),
        ],
      }))
      return
    }

    const safeXp = Number(newTaskXp)
    const finalXp = Number.isNaN(safeXp) ? 20 : Math.max(5, Math.min(100, safeXp))

    const newTask = createTask(title, newTaskCategory, finalXp)

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

    if (editingTaskId === taskId) {
      cancelEdit()
    }
  }

  function startEdit(task) {
    setEditingTaskId(task.id)
    setEditTitle(task.title)
    setEditCategory(task.category)
    setEditXp(task.xp)
  }

  function cancelEdit() {
    setEditingTaskId(null)
    setEditTitle('')
    setEditCategory('学习')
    setEditXp(20)
  }

  function saveEdit(taskId) {
    const title = editTitle.trim()
    if (!title) return

    const safeXp = Number(editXp)
    const finalXp = Number.isNaN(safeXp) ? 20 : Math.max(5, Math.min(100, safeXp))

    setGameData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title,
              category: editCategory,
              xp: finalXp,
            }
          : task
      ),
      logs: [`编辑任务：${title}`, ...prev.logs.slice(0, 7)],
    }))

    cancelEdit()
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
    cancelEdit()
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

  const topGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr',
    gap: '20px',
  }

  const secondGridStyle = {
    marginTop: '20px',
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '0.95fr 1.05fr',
    gap: '20px',
  }

  const tasksGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile
      ? '1fr'
      : isTablet
      ? 'repeat(2, minmax(0, 1fr))'
      : 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #061127 0%, #0b1732 45%, #132347 100%)',
        color: '#f8fbff',
        padding: isMobile ? '16px 12px' : '32px 20px',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '18px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setActiveView('overview')}
            style={tabButtonStyle(activeView === 'overview')}
          >
            🎮 主面板
          </button>
          <button
            onClick={() => setActiveView('stats')}
            style={tabButtonStyle(activeView === 'stats')}
          >
            📊 数据统计
          </button>
        </div>

        {activeView === 'overview' ? (
          <>
            <div style={topGridStyle}>
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
                        fontSize: isMobile ? '34px' : '44px',
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
                        fontSize: isMobile ? '18px' : '22px',
                        fontWeight: 800,
                      }}
                    >
                      {gameData.playerTitle}
                    </div>
                  </div>

                  <div style={{ minWidth: isMobile ? 'auto' : '180px', textAlign: isMobile ? 'left' : 'right' }}>
                    <div style={{ fontSize: '16px', color: '#d8e4ff', fontWeight: 700 }}>
                      连续成长
                    </div>
                    <div style={{ fontSize: isMobile ? '30px' : '36px', fontWeight: 900, color: '#ffffff' }}>
                      🔥 {gameData.streak} 天
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '28px',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
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
                    fontSize: isMobile ? '16px' : '18px',
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
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 120px',
                      gap: '12px',
                    }}
                  >
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      style={inputStyle}
                    >
                      {CATEGORY_OPTIONS.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
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
                  <div style={{ fontSize: isMobile ? '26px' : '30px', fontWeight: 900, color: '#ffffff' }}>
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

            <div style={secondGridStyle}>
              <div style={panelStyle}>
                <h2 style={sectionTitle}>⏳ 专注计时器</h2>

                <div
                  style={{
                    fontSize: isMobile ? '42px' : '52px',
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
                    gridTemplateColumns: isMobile
                      ? '1fr'
                      : 'repeat(auto-fit, minmax(180px, 1fr))',
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
                <h2 style={{ margin: 0, fontSize: isMobile ? '26px' : '30px', color: '#ffffff' }}>
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

              <div style={tasksGridStyle}>
                {gameData.tasks.map((task) => {
                  const isEditing = editingTaskId === task.id

                  return (
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
                      {!isEditing ? (
                        <>
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
                              <>
                                <button
                                  onClick={() => startEdit(task)}
                                  style={miniButtonStyle}
                                >
                                  编辑任务
                                </button>

                                <button
                                  onClick={() => deleteTask(task.id)}
                                  style={dangerButtonStyle}
                                >
                                  删除任务
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                          <div
                            style={{
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '18px',
                            }}
                          >
                            ✏️ 编辑任务
                          </div>

                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            style={inputStyle}
                          />

                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            style={inputStyle}
                          >
                            {CATEGORY_OPTIONS.map((item) => (
                              <option key={item}>{item}</option>
                            ))}
                          </select>

                          <input
                            type="number"
                            value={editXp}
                            onChange={(e) => setEditXp(e.target.value)}
                            min="5"
                            max="100"
                            style={inputStyle}
                          />

                          <button
                            onClick={() => saveEdit(task.id)}
                            style={primaryButtonStyle}
                          >
                            保存修改
                          </button>

                          <button onClick={cancelEdit} style={secondaryButtonStyle}>
                            取消编辑
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                gap: '16px',
              }}
            >
              <StatCard label="本周完成任务" value={`${weeklyCompletedCount}`} />
              <StatCard label="累计专注分钟" value={`${formatMinutes(gameData.focusTotalSeconds)}`} />
              <StatCard label="已解锁徽章" value={`${unlockedBadges}`} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '20px',
              }}
            >
              <div style={panelStyle}>
                <h2 style={sectionTitle}>📈 最近 7 天完成数</h2>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {last7DaysStats.map((item) => {
                    const max = Math.max(...last7DaysStats.map((x) => x.count), 1)
                    const width = `${(item.count / max) * 100}%`
                    return (
                      <div key={item.label}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                            color: '#e8f2ff',
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          <span>{item.label}</span>
                          <span>{item.count}</span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '14px',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width,
                              height: '100%',
                              borderRadius: '999px',
                              background:
                                'linear-gradient(90deg, #45e08a 0%, #52c7ff 50%, #9c7bff 100%)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={panelStyle}>
                <h2 style={sectionTitle}>🧩 本周任务类别占比</h2>
                <div style={{ display: 'grid', gap: '14px' }}>
                  {categoryStats.map((item) => (
                    <div key={item.category}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                          color: '#e8f2ff',
                          fontWeight: 700,
                          fontSize: '14px',
                        }}
                      >
                        <span>{item.category}</span>
                        <span>
                          {item.count} 次 · {item.percent}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '14px',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${item.percent}%`,
                            height: '100%',
                            borderRadius: '999px',
                            background:
                              'linear-gradient(90deg, #52c7ff 0%, #9c7bff 100%)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={panelStyle}>
              <h2 style={sectionTitle}>🧠 数据解读</h2>
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                  color: '#edf5ff',
                  fontSize: '16px',
                  lineHeight: 1.7,
                  fontWeight: 600,
                }}
              >
                <div>本周你一共完成了 <span style={{ color: '#8fd3ff' }}>{weeklyCompletedCount}</span> 个任务。</div>
                <div>累计专注了 <span style={{ color: '#8fd3ff' }}>{formatMinutes(gameData.focusTotalSeconds)}</span> 分钟。</div>
                <div>
                  当前连续成长 <span style={{ color: '#8fd3ff' }}>{gameData.streak}</span> 天，已经不是“偶尔努力”，而是在形成系统。
                </div>
                <div>
                  当前已解锁 <span style={{ color: '#8fd3ff' }}>{unlockedBadges}</span> 个徽章。成长最重要的不是一天爆发，而是持续可见的正反馈。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {badgeModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle(isMobile)}>
            <div style={{ fontSize: '56px', marginBottom: '10px' }}>{badgeModal.icon}</div>
            <div
              style={{
                color: '#8fd3ff',
                fontWeight: 800,
                fontSize: '16px',
                marginBottom: '8px',
              }}
            >
              新成就解锁！
            </div>
            <div
              style={{
                fontSize: isMobile ? '28px' : '34px',
                fontWeight: 900,
                color: '#ffffff',
                marginBottom: '10px',
              }}
            >
              {badgeModal.name}
            </div>
            <div
              style={{
                color: '#dbe9ff',
                fontSize: '16px',
                lineHeight: 1.7,
                fontWeight: 600,
                marginBottom: '18px',
              }}
            >
              {badgeModal.desc}
            </div>
            <button onClick={() => setBadgeModal(null)} style={primaryButtonStyle}>
              太好了
            </button>
          </div>
        </div>
      )}
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

const miniButtonStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#d8e6ff',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
}

const dangerButtonStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid rgba(255,120,120,0.22)',
  background: 'rgba(255,80,80,0.08)',
  color: '#ffd0d0',
  fontSize: '14px',
  fontWeight: 700,
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

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 8, 23, 0.68)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  zIndex: 1000,
}

const modalCardStyle = (isMobile) => ({
  width: '100%',
  maxWidth: '520px',
  borderRadius: '24px',
  padding: isMobile ? '24px 18px' : '30px 28px',
  background: 'linear-gradient(135deg, rgba(16,28,56,0.98), rgba(30,41,82,0.98))',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
  textAlign: 'center',
})

const tabButtonStyle = (active) => ({
  background: active
    ? 'linear-gradient(135deg, #46c5ff, #8b63ff)'
    : 'rgba(255,255,255,0.08)',
  color: '#ffffff',
  border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
  borderRadius: '14px',
  padding: '12px 18px',
  fontSize: '15px',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: active ? '0 10px 24px rgba(70,197,255,0.22)' : 'none',
})

export default App