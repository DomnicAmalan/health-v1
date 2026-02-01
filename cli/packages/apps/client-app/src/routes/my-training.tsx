/**
 * My Training Module
 * User's training courses, progress, and certificates
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  Download,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { format } from "date-fns";

export const Route = createFileRoute("/my-training")({
  component: MyTrainingComponent,
});

function MyTrainingComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.TRAINING.VIEW} resource="training">
      <MyTrainingInner />
    </ProtectedRoute>
  );
}

type CourseStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  requiredByDate?: string;
  isRequired: boolean;
  status: CourseStatus;
  progress: number;
  completedAt?: string;
  certificateId?: string;
  lastAccessedAt?: string;
}

interface Certificate {
  id: string;
  courseTitle: string;
  issuedDate: string;
  expiresDate?: string;
  credentialId: string;
  status: "ACTIVE" | "EXPIRED";
}

function MyTrainingInner() {
  const { t } = useTranslation();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCertificate, setShowCertificate] = useState<Certificate | null>(null);

  // Fetch user's enrolled courses
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["my-courses"],
    queryFn: () =>
      apiClient.get<Course[]>(API_ROUTES.TRAINING.MY_COURSES || "/v1/training/my-courses"),
  });

  // Fetch user's certificates
  const { data: certificates, isLoading: isLoadingCertificates } = useQuery({
    queryKey: ["my-certificates"],
    queryFn: () =>
      apiClient.get<Certificate[]>(
        API_ROUTES.TRAINING.MY_CERTIFICATES || "/v1/training/my-certificates"
      ),
  });

  // Group courses by status
  const requiredCourses = courses?.filter((c) => c.isRequired && c.status !== "COMPLETED") || [];
  const inProgressCourses = courses?.filter((c) => c.status === "IN_PROGRESS") || [];
  const completedCourses = courses?.filter((c) => c.status === "COMPLETED") || [];
  const overdueCourses = courses?.filter((c) => c.status === "OVERDUE") || [];

  const getStatusBadge = (status: CourseStatus) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case "OVERDUE":
        return <Badge variant="destructive">Overdue</Badge>;
      case "NOT_STARTED":
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Training</h1>
        <p className="text-muted-foreground mt-2">
          Track your courses, view progress, and access certificates
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Enrolled courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCourses.length}</div>
            <p className="text-xs text-muted-foreground">Active courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCourses.length}</div>
            <p className="text-xs text-muted-foreground">Certificates earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCourses.length}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueCourses.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Overdue Training Requirements
            </CardTitle>
            <CardDescription>
              You have {overdueCourses.length} overdue course{overdueCourses.length > 1 ? "s" : ""}{" "}
              that must be completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-3 bg-destructive/10 rounded-md"
                >
                  <div>
                    <div className="font-medium">{course.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Due: {course.requiredByDate ? format(new Date(course.requiredByDate), "MMM d, yyyy") : "N/A"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setSelectedCourse(course)}
                  >
                    Start Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="required">Required</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        {/* All Courses */}
        <TabsContent value="all" className="space-y-4">
          {isLoadingCourses ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">Loading courses...</div>
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onStart={() => setSelectedCourse(course)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No courses assigned</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Required Courses */}
        <TabsContent value="required" className="space-y-4">
          {requiredCourses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {requiredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onStart={() => setSelectedCourse(course)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p className="text-muted-foreground">All required training completed!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* In Progress */}
        <TabsContent value="in-progress" className="space-y-4">
          {inProgressCourses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inProgressCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onStart={() => setSelectedCourse(course)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No courses in progress</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Completed */}
        <TabsContent value="completed" className="space-y-4">
          {completedCourses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onStart={() => setSelectedCourse(course)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No completed courses yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Certificates */}
        <TabsContent value="certificates" className="space-y-4">
          {isLoadingCertificates ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">Loading certificates...</div>
            </div>
          ) : certificates && certificates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.map((cert) => (
                <Card
                  key={cert.id}
                  className={cert.status === "EXPIRED" ? "border-orange-500" : "border-green-500"}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Award
                          className={`h-6 w-6 ${cert.status === "EXPIRED" ? "text-orange-500" : "text-green-600"}`}
                        />
                        <div>
                          <CardTitle className="text-base">{cert.courseTitle}</CardTitle>
                          <CardDescription className="mt-1">
                            Credential ID: {cert.credentialId}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={cert.status === "EXPIRED" ? "destructive" : "default"}>
                        {cert.status === "EXPIRED" ? "Expired" : "Active"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Issued:</span>
                        <span>{format(new Date(cert.issuedDate), "MMM d, yyyy")}</span>
                      </div>
                      {cert.expiresDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expires:</span>
                          <span>{format(new Date(cert.expiresDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full mt-4"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCertificate(cert)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No certificates earned yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete courses to earn certificates
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Course Viewer Dialog */}
      {selectedCourse && (
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCourse.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm">{selectedCourse.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Duration</div>
                  <div className="font-medium">{selectedCourse.durationMinutes} minutes</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Category</div>
                  <div className="font-medium">{selectedCourse.category}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Progress</div>
                  <div className="font-medium">{selectedCourse.progress}%</div>
                </div>
              </div>
              <div className="text-center py-12 border-2 border-dashed rounded-md">
                <PlayCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
                <p className="font-medium mb-2">Course content viewer</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Interactive course content would be displayed here
                </p>
                <Button>
                  {selectedCourse.status === "NOT_STARTED" ? "Start Course" : "Continue Course"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Certificate Viewer Dialog */}
      {showCertificate && (
        <Dialog open={!!showCertificate} onOpenChange={() => setShowCertificate(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Certificate of Completion</DialogTitle>
            </DialogHeader>
            <div className="border-4 border-primary p-8 text-center space-y-4">
              <Award className="h-16 w-16 mx-auto text-primary" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{showCertificate.courseTitle}</h2>
                <p className="text-muted-foreground">This certifies that</p>
                <p className="text-xl font-semibold">[User Name]</p>
                <p className="text-muted-foreground">has successfully completed the above course</p>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Credential ID: {showCertificate.credentialId}
                </div>
                <div className="text-sm text-muted-foreground">
                  Issued: {format(new Date(showCertificate.issuedDate), "MMMM d, yyyy")}
                </div>
                {showCertificate.expiresDate && (
                  <div className="text-sm text-muted-foreground">
                    Valid Until: {format(new Date(showCertificate.expiresDate), "MMMM d, yyyy")}
                  </div>
                )}
              </div>
            </div>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CourseCard({ course, onStart }: { course: Course; onStart: () => void }) {
  return (
    <Card className={course.status === "OVERDUE" ? "border-destructive" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{course.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{course.description}</CardDescription>
          </div>
          {getStatusBadge(course.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{course.durationMinutes} min</span>
          </div>
          {course.isRequired && <Badge variant="outline">Required</Badge>}
        </div>

        {course.status !== "NOT_STARTED" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
          </div>
        )}

        {course.requiredByDate && course.status !== "COMPLETED" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Due: {format(new Date(course.requiredByDate), "MMM d, yyyy")}
            </span>
          </div>
        )}

        {course.completedAt && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Completed {format(new Date(course.completedAt), "MMM d, yyyy")}</span>
          </div>
        )}

        <Button className="w-full" size="sm" onClick={onStart}>
          {course.status === "COMPLETED" ? "Review Course" : course.status === "NOT_STARTED" ? "Start Course" : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: CourseStatus) {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-green-600">Completed</Badge>;
    case "IN_PROGRESS":
      return <Badge className="bg-blue-600">In Progress</Badge>;
    case "OVERDUE":
      return <Badge variant="destructive">Overdue</Badge>;
    case "NOT_STARTED":
      return <Badge variant="secondary">Not Started</Badge>;
  }
}
