export const notifications = [
  {
    id: 1,
    title: "New Event Host Registered",
    role: "System",
    desc: "A new event host has been registered and awaits review.",
    avatar: "01.png",
    status: "online",
    unread_message: false,
    type: "text",
    date: "2 days ago"
  },
  {
    id: 2,
    title: "Premium Subscription Renewal",
    role: "System",
    desc: "Event Host premium subscription is renewing soon.",
    avatar: "02.png",
    status: "online",
    unread_message: true,
    type: "text",
    date: "11 am"
  },
  {
    id: 3,
    title: "System Maintenance Scheduled",
    role: "Admin",
    desc: "Scheduled maintenance on database systems.",
    avatar: "03.png",
    status: "busy",
    unread_message: true,
    type: "confirm",
    date: "12 pm"
  },
  {
    id: 4,
    title: "New Vendor Application",
    role: "System",
    desc: "A new vendor has applied for platform access.",
    avatar: "04.png",
    status: "online",
    unread_message: true,
    type: "text",
    date: "1 pm"
  },
  {
    id: 5,
    title: "Event Reported",
    role: "Moderation",
    desc: "An event has been reported for policy violation.",
    avatar: "05.png",
    status: "busy",
    unread_message: false,
    type: "text",
    date: "3 pm"
  }
];

export type Notification = (typeof notifications)[number];
