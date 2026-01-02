import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DayAssistantHeader from './DayAssistantHeader';
import TimeBlockSection from './TimeBlockSection';
import TaskListSection from './TaskListSection';
import QuickAddModal from './QuickAddModal';
import UniversalModal from './UniversalModal';
import { Task, TimeBlock } from '@/types';
import { deleteTask, toggleTaskCompletion, updateTaskTimeBlock, updateTask, deleteTimeBlock, updateTimeBlock } from '@/services/database';
import CalendarIntegrationService from '@/services/CalendarIntegrationService';
import { useFocusEffect } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DayAssistantV2ViewProps {
  selectedDate: Date;
  tasks: Task[];
  timeBlocks: TimeBlock[];
  onTasksChange: () => void;
  onTimeBlocksChange: () => void;
  navigation: any;
}

const DayAssistantV2View: React.FC<DayAssistantV2ViewProps> = ({
  selectedDate,
  tasks,
  timeBlocks,
  onTasksChange,
  onTimeBlocksChange,
  navigation,
}) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showUniversalModal, setShowUniversalModal] = useState(false);
  const [universalModalTask, setUniversalModalTask] = useState<Task | null>(null);
  const [universalModalTimeBlock, setUniversalModalTimeBlock] = useState<TimeBlock | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const fabAnimation = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);

  // Reset modals when component unmounts or date changes
  useEffect(() => {
    return () => {
      setShowQuickAdd(false);
      setShowUniversalModal(false);
      setUniversalModalTask(null);
      setUniversalModalTimeBlock(null);
    };
  }, [selectedDate]);

  // Reset modals when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setShowQuickAdd(false);
        setShowUniversalModal(false);
        setUniversalModalTask(null);
        setUniversalModalTimeBlock(null);
      };
    }, [])
  );

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDiff = currentScrollY - lastScrollY.current;

    if (scrollDiff > 5 && currentScrollY > 50) {
      // Scrolling down
      Animated.timing(fabAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (scrollDiff < -5 || currentScrollY <= 50) {
      // Scrolling up or near top
      Animated.timing(fabAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    lastScrollY.current = currentScrollY;
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      onTasksChange();
      setShowUniversalModal(false);
      setUniversalModalTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      await toggleTaskCompletion(taskId, completed);
      onTasksChange();
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handleUpdateTaskTimeBlock = async (taskId: string, timeBlockId: string | null) => {
    try {
      await updateTaskTimeBlock(taskId, timeBlockId);
      onTasksChange();
    } catch (error) {
      console.error('Error updating task time block:', error);
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (universalModalTask) {
        // Updating existing task
        await updateTask(universalModalTask.id, taskData);
      }
      onTasksChange();
      setShowUniversalModal(false);
      setUniversalModalTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDeleteTimeBlock = async (timeBlockId: string) => {
    try {
      await deleteTimeBlock(timeBlockId);
      // Also update any tasks that were in this time block
      const tasksInBlock = tasks.filter(t => t.timeBlockId === timeBlockId);
      for (const task of tasksInBlock) {
        await updateTaskTimeBlock(task.id, null);
      }
      onTimeBlocksChange();
      onTasksChange();
      setShowUniversalModal(false);
      setUniversalModalTimeBlock(null);
    } catch (error) {
      console.error('Error deleting time block:', error);
    }
  };

  const handleSaveTimeBlock = async (timeBlockData: Partial<TimeBlock>) => {
    try {
      if (universalModalTimeBlock) {
        await updateTimeBlock(universalModalTimeBlock.id, timeBlockData);
      }
      onTimeBlocksChange();
      setShowUniversalModal(false);
      setUniversalModalTimeBlock(null);
    } catch (error) {
      console.error('Error saving time block:', error);
    }
  };

  const handleTaskPress = (task: Task) => {
    setUniversalModalTask(task);
    setUniversalModalTimeBlock(null);
    setShowUniversalModal(true);
  };

  const handleTimeBlockPress = (timeBlock: TimeBlock) => {
    setUniversalModalTimeBlock(timeBlock);
    setUniversalModalTask(null);
    setShowUniversalModal(true);
  };

  const handleCreateTimeBlockFromTask = async (task: Task) => {
    try {
      // Get task details for time block creation
      const taskDetails = tasks.find(t => t.id === task.id);
      if (!taskDetails) return;

      // Create a time block from the task
      const calendarService = CalendarIntegrationService.getInstance();
      
      // Find a suitable time slot for the task
      const startTime = new Date(selectedDate);
      startTime.setHours(9, 0, 0, 0); // Default to 9 AM
      
      const duration = taskDetails.estimatedDuration || 60; // Default to 1 hour
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const newTimeBlock = await calendarService.createTimeBlock(
        taskDetails.title,
        startTime,
        endTime,
        taskDetails.description || undefined,
        'work'
      );

      // Link the task to the new time block
      await updateTaskTimeBlock(task.id, newTimeBlock.id);
      
      onTimeBlocksChange();
      onTasksChange();
      setShowUniversalModal(false);
      setUniversalModalTask(null);
    } catch (error) {
      console.error('Error creating time block from task:', error);
    }
  };

  const handleUnlinkFromTimeBlock = async (task: Task) => {
    try {
      await updateTaskTimeBlock(task.id, null);
      onTasksChange();
      // Keep modal open so user can see the change
    } catch (error) {
      console.error('Error unlinking task from time block:', error);
    }
  };

  const handleLinkToTimeBlock = async (task: Task, timeBlockId: string) => {
    try {
      await updateTaskTimeBlock(task.id, timeBlockId);
      onTasksChange();
      // Keep modal open so user can see the change
    } catch (error) {
      console.error('Error linking task to time block:', error);
    }
  };

  // Filter tasks for the selected date
  const filteredTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return (
      taskDate.getDate() === selectedDate.getDate() &&
      taskDate.getMonth() === selectedDate.getMonth() &&
      taskDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Filter time blocks for the selected date
  const filteredTimeBlocks = timeBlocks.filter(block => {
    const blockDate = new Date(block.startTime);
    return (
      blockDate.getDate() === selectedDate.getDate() &&
      blockDate.getMonth() === selectedDate.getMonth() &&
      blockDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Separate unscheduled tasks (tasks without time blocks)
  const unscheduledTasks = filteredTasks.filter(task => !task.timeBlockId);

  // Get tasks for each time block
  const getTasksForTimeBlock = (timeBlockId: string) => {
    return filteredTasks.filter(task => task.timeBlockId === timeBlockId);
  };

  const handleQuickAddPress = () => {
    setUniversalModalTask(null);
    setShowUniversalModal(true);
  };

  return (
    <View style={styles.container}>
      <DayAssistantHeader
        selectedDate={selectedDate}
        onDateChange={() => {}}
        navigation={navigation}
      />
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <TimeBlockSection
          timeBlocks={filteredTimeBlocks}
          getTasksForTimeBlock={getTasksForTimeBlock}
          onTaskPress={handleTaskPress}
          onTimeBlockPress={handleTimeBlockPress}
          onToggleTaskCompletion={handleToggleTaskCompletion}
          selectedDate={selectedDate}
        />

        <TaskListSection
          tasks={unscheduledTasks}
          onTaskPress={handleTaskPress}
          onToggleTaskCompletion={handleToggleTaskCompletion}
        />

        {/* Bottom padding to ensure content is not hidden by FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [
              {
                translateY: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
              {
                scale: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            opacity: fabAnimation,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={handleQuickAddPress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Add Modal */}
      <QuickAddModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        selectedDate={selectedDate}
        onTaskCreated={onTasksChange}
        onTimeBlockCreated={onTimeBlocksChange}
      />

      {/* Universal Modal */}
      <UniversalModal
        visible={showUniversalModal}
        onClose={() => {
          setShowUniversalModal(false);
          setUniversalModalTask(null);
          setUniversalModalTimeBlock(null);
        }}
        task={universalModalTask}
        timeBlock={universalModalTimeBlock}
        selectedDate={selectedDate}
        onTaskCreated={onTasksChange}
        onTimeBlockCreated={onTimeBlocksChange}
        onDeleteTask={handleDeleteTask}
        onSaveTask={handleSaveTask}
        onDeleteTimeBlock={handleDeleteTimeBlock}
        onSaveTimeBlock={handleSaveTimeBlock}
        onCreateTimeBlockFromTask={handleCreateTimeBlockFromTask}
        onUnlinkFromTimeBlock={handleUnlinkFromTimeBlock}
        onLinkToTimeBlock={handleLinkToTimeBlock}
        availableTimeBlocks={filteredTimeBlocks}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 80,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default DayAssistantV2View;