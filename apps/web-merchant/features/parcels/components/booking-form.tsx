"use client";

import React from "react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  Badge,
} from "@dhruto/ui";
import { useParcelBooking } from "../hooks/use-parcel-booking";
import { Package, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Truck } from "lucide-react";

export function BookingForm() {
  const { form, onSubmit, isLoading, createdParcel, serverError, resetForm } =
    useParcelBooking();

  const watchWeight = form.watch("weight") || 1;
  const estimatedFee =
    watchWeight <= 1 ? 60 : 60 + Math.ceil(watchWeight - 1) * 20;

  if (createdParcel) {
    return (
      <Card className="max-w-2xl mx-auto border-emerald-200 shadow-md">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 flex-shrink-0" />
            <div>
              <CardTitle className="text-xl text-emerald-950">
                Parcel Booking Confirmed!
              </CardTitle>
              <CardDescription className="text-emerald-700">
                Your parcel order has been created and assigned tracking code.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Tracking Code
              </span>
              <p className="text-xl font-mono font-bold text-slate-900">
                {createdParcel.trackingCode}
              </p>
            </div>
            <Badge variant="success" className="w-fit">
              Status: {createdParcel.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Recipient
              </span>
              <p className="font-medium text-slate-900">{createdParcel.recipientName}</p>
              <p className="font-mono text-slate-600">{createdParcel.recipientPhone}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Destination
              </span>
              <p className="font-medium text-slate-900">
                {createdParcel.thana}, {createdParcel.district}
              </p>
              <p className="text-slate-600 text-xs">{createdParcel.deliveryAddress}</p>
            </div>

            <div className="space-y-1 border-t pt-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Weight
              </span>
              <p className="font-medium text-slate-900">{createdParcel.weight} kg</p>
            </div>

            <div className="space-y-1 border-t pt-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Collection on Delivery (COD)
              </span>
              <p className="font-medium text-slate-900">৳{createdParcel.codAmount}</p>
            </div>

            <div className="space-y-1 border-t pt-3 col-span-full">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Standard Delivery Charge
              </span>
              <p className="text-lg font-bold text-slate-900">
                ৳{createdParcel.deliveryFee}
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t bg-slate-50/50 p-4">
          <Button variant="outline" onClick={resetForm} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Book Another Parcel
          </Button>
          <Button
            onClick={() => window.print()}
            variant="default"
            className="flex items-center gap-2"
          >
            <Truck className="h-4 w-4" />
            Print Shipping Label
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Create New Parcel Booking</CardTitle>
            <CardDescription>
              Enter delivery recipient information and parcel specifications.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {serverError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Submission Error</p>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form id="parcel-booking-form" onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Tanvir Ahmed"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Mobile (BD) *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="01712345678"
                        maxLength={11}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>11-digit Bangladesh phone number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Dhaka"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thana"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thana / Upazila *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Dhanmondi"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Delivery Address *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="House, road, sector, or landmark details"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        placeholder="1.0"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimated standard fee: ৳{estimatedFee}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash on Delivery (BDT) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="500000"
                        placeholder="0"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Set 0 if prepaid order</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-end gap-3 border-t bg-slate-50/50 p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button
          type="submit"
          form="parcel-booking-form"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing Booking...
            </>
          ) : (
            <>
              Confirm Booking
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
