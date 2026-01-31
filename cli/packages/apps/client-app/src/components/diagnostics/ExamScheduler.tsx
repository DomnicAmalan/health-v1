/**
 * Exam Scheduler Component
 * Schedule radiology examinations
 */

import { memo, useCallback, useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@lazarus-life/ui-components";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import type { RadiologyRoom, RadiologyOrder, RadiologyScheduleSlot } from "@lazarus-life/shared";

interface ExamSchedulerProps {
  order: RadiologyOrder;
  rooms: RadiologyRoom[];
  schedule: Record<string, RadiologyScheduleSlot[]>; // roomId -> slots
  onSchedule: (data: {
    orderId: string;
    examTypeId: string;
    roomId: string;
    scheduledDate: string;
    scheduledTime: string;
    technicianId?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ExamScheduler = memo(function ExamScheduler({
  order,
  rooms,
  schedule,
  onSchedule,
  onCancel,
  isSubmitting = false,
}: ExamSchedulerProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [technicianId, setTechnicianId] = useState<string>("");

  const availableRooms = rooms.filter((room) => {
    // Filter rooms that support the modality of exams in this order
    const orderModalities = order.exams?.map((e) => e.modality) || [];
    return room.status === "available" && orderModalities.includes(room.modality);
  });

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const roomSchedule = selectedRoomId ? schedule[selectedRoomId] || [] : [];

  // Generate available time slots (simplified - in real app would come from backend)
  const availableSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ].filter((slot) => {
    // Filter out already booked slots
    return !roomSchedule.some(
      (s) => s.startTime === slot && s.status === "booked"
    );
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRoomId || !selectedDate || !selectedTime) return;

      const examTypeId = order.exams?.[0]?.examTypeId || order.examTypeIds?.[0];
      if (!examTypeId) return;

      onSchedule({
        orderId: order.id,
        examTypeId,
        roomId: selectedRoomId,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        technicianId: technicianId || undefined,
      });
    },
    [order, selectedRoomId, selectedDate, selectedTime, technicianId, onSchedule]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Order #</p>
              <p className="font-medium">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Patient</p>
              <p className="font-medium">{order.patientId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Urgency</p>
              <Badge
                variant={order.urgency === "stat" ? "destructive" : "secondary"}
              >
                {order.urgency}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Exams</p>
              <p className="font-medium">{order.exams?.length || 1} exam(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Form */}
      <div className="grid grid-cols-2 gap-6">
        {/* Room Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Select Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room">Available Rooms</Label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger id="room">
                  <SelectValue placeholder="Select a room..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.length === 0 ? (
                    <SelectItem value="" disabled>
                      No available rooms
                    </SelectItem>
                  ) : (
                    availableRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.roomName} ({room.roomCode}) - {room.modality.toUpperCase()}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedRoom && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">{selectedRoom.roomName}</p>
                <p className="text-muted-foreground">
                  Location: {selectedRoom.location || "Not specified"}
                </p>
                <p className="text-muted-foreground">
                  Modality: {selectedRoom.modality.toUpperCase()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date & Time Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Select Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time Slot</Label>
              {!selectedRoomId ? (
                <p className="text-sm text-muted-foreground">
                  Select a room first to see available slots
                </p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-amber-600">
                  No available slots for this date. Please select another date.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant={selectedTime === slot ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(slot)}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {slot}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technician Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Assign Technician (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="technician">Technician ID</Label>
            <Input
              id="technician"
              placeholder="Enter technician ID or leave blank for auto-assignment..."
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary & Actions */}
      {selectedRoomId && selectedDate && selectedTime && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Scheduled Appointment</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRoom?.roomName} on{" "}
                  {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
                </p>
              </div>
              <Badge variant="outline" className="text-primary">
                {order.urgency === "stat" ? "STAT" : "Ready to Schedule"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            !selectedRoomId || !selectedDate || !selectedTime || isSubmitting
          }
        >
          {isSubmitting ? "Scheduling..." : "Schedule Exam"}
        </Button>
      </div>
    </form>
  );
});
