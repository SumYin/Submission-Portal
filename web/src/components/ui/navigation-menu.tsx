"use client"

import * as React from "react"
import { Root as NavigationMenuPrimitiveRoot, List, Item, Trigger, Content, Link as NavLink, Indicator, Viewport } from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitiveRoot>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitiveRoot>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitiveRoot
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  />
))
NavigationMenu.displayName = "NavigationMenu"

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof List>,
  React.ComponentPropsWithoutRef<typeof List>
>(({ className, ...props }, ref) => (
  <List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center gap-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = "NavigationMenuList"

const navigationMenuTriggerStyle = cva(
  "inline-flex h-9 items-center justify-center rounded-md bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50",
)

const NavigationMenuItem = Item

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof Trigger>,
  React.ComponentPropsWithoutRef<typeof Trigger>
>(({ className, ...props }, ref) => (
  <Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  />
))
NavigationMenuTrigger.displayName = "NavigationMenuTrigger"

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof Content>,
  React.ComponentPropsWithoutRef<typeof Content>
>(({ className, ...props }, ref) => (
  <Content
    ref={ref}
    className={cn(
      "absolute left-0 top-full w-auto min-w-[12rem] rounded-md border bg-popover p-2 text-popover-foreground shadow-md",
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = "NavigationMenuContent"

const NavigationMenuLink = React.forwardRef<
  React.ElementRef<typeof NavLink>,
  React.ComponentPropsWithoutRef<typeof NavLink>
>(({ className, ...props }, ref) => (
  <NavLink ref={ref} className={cn("block select-none rounded-md p-2 text-sm outline-none transition-colors hover:bg-muted/50", className)} {...props} />
))
NavigationMenuLink.displayName = "NavigationMenuLink"

const NavigationMenuIndicatorComp = React.forwardRef<
  React.ElementRef<typeof Indicator>,
  React.ComponentPropsWithoutRef<typeof Indicator>
>(({ className, ...props }, ref) => (
  <Indicator ref={ref} className={cn("top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden", className)} {...props} />
))
NavigationMenuIndicatorComp.displayName = "NavigationMenuIndicator"

const NavigationMenuViewportComp = React.forwardRef<
  React.ElementRef<typeof Viewport>,
  React.ComponentPropsWithoutRef<typeof Viewport>
>(({ className, ...props }, ref) => (
  <div className="absolute left-0 top-full flex w-full justify-center">
    <Viewport ref={ref} className={cn("origin-top-center rounded-md border bg-popover text-popover-foreground shadow", className)} {...props} />
  </div>
))
NavigationMenuViewportComp.displayName = "NavigationMenuViewport"

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicatorComp as NavigationMenuIndicator,
  NavigationMenuViewportComp as NavigationMenuViewport,
  navigationMenuTriggerStyle,
}
