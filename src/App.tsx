import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import FounderMessage from "./pages/FounderMessage.tsx";
import DirectorMessage from "./pages/DirectorMessage.tsx";
import HeadmasterMessage from "./pages/HeadmasterMessage.tsx";
import Classes from "./pages/Classes.tsx";
import Departments from "./pages/Departments.tsx";
import Teachers from "./pages/Teachers.tsx";
import NoticeEvents from "./pages/NoticeEvents.tsx";
import NewsMedia from "./pages/NewsMedia.tsx";
import ContactUs from "./pages/ContactUs.tsx";
import GalleryPage from "./pages/GalleryPage.tsx";
import LoginStudents from "./pages/LoginStudents.tsx";
import LoginTeachers from "./pages/LoginTeachers.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/message/founder" element={<FounderMessage />} />
          <Route path="/message/director" element={<DirectorMessage />} />
          <Route path="/message/headmaster" element={<HeadmasterMessage />} />
          <Route path="/academics/classes" element={<Classes />} />
          <Route path="/academics/departments" element={<Departments />} />
          <Route path="/academics/teachers" element={<Teachers />} />
          <Route path="/notice-and-events" element={<NoticeEvents />} />
          <Route path="/news-and-media" element={<NewsMedia />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/login/students" element={<LoginStudents />} />
          <Route path="/login/teachers" element={<LoginTeachers />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
