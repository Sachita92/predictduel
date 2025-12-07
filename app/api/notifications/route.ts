import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Notification from '@/models/Notification'
import User from '@/models/User'

/**
 * API Route to Get User Notifications
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const privyId = searchParams.get('privyId')

    if (!privyId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    // Find user
    const user = await User.findOne({ privyId })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch notifications for user, sorted by newest first
    const notifications = await Notification.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('relatedUser', 'username avatar')
      .lean()

    // Format notifications
    const formattedNotifications = notifications.map((notif: any) => ({
      id: notif._id.toString(),
      type: notif.type,
      title: notif.title,
      message: notif.message,
      read: notif.read,
      actionUrl: notif.actionUrl,
      createdAt: notif.createdAt,
      relatedUser: notif.relatedUser ? {
        username: notif.relatedUser.username,
        avatar: notif.relatedUser.avatar,
      } : null,
    }))

    const unreadCount = notifications.filter((n: any) => !n.read).length

    return NextResponse.json(
      {
        success: true,
        notifications: formattedNotifications,
        unreadCount,
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
      },
      { status: 500 }
    )
  }
}

/**
 * API Route to Mark Notification as Read
 */
export async function PUT(req: NextRequest) {
  try {
    await connectDB()

    const body = await req.json()
    const { privyId, notificationId, markAll } = body

    if (!privyId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    // Find user
    const user = await User.findOne({ privyId })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (markAll) {
      // Mark all notifications as read
      await Notification.updateMany(
        { user: user._id, read: false },
        { read: true }
      )
    } else if (notificationId) {
      // Mark specific notification as read
      const notification = await Notification.findOne({
        _id: notificationId,
        user: user._id,
      })

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }

      notification.read = true
      await notification.save()
    } else {
      return NextResponse.json(
        { error: 'notificationId or markAll is required' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: markAll ? 'All notifications marked as read' : 'Notification marked as read',
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update notification',
      },
      { status: 500 }
    )
  }
}

